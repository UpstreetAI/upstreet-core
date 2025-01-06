import React from 'react';
import { APIDataSource } from '../components/plugins/api-data-source';
import { z } from 'zod';
import { Action } from '../components/core/action';
import { PendingActionEvent } from '../classes/pending-action-event';
import dedent from 'dedent';


/*
  example for adding a API data source in the agent.json:
  "dataSources": [
    {
      "id": "weather-api",
      "name": "Weather API",
      "type": "api",
      "description": "Use this data source to get the current weather for a location by providing the required arguments",
      "params": {
        "key": "xxx"
      },
      "endpoint": "https://api.weatherapi.com/v1/current.json",
      "schema": {
        "type": "object",
        "properties": {
          "q": {
            "type": "string",
            "description": "Location name or coordinates"
          }
        },
        "required": ["q"]
      },
      "examples": [
        {
          "q": "London"
        }
      ]
    },
    {
      "id": "pokedex-ability-api",
      "name": "Pokédex Ability API",
      "type": "api", 
      "description": "Use this data source to get information about Pokémon abilities by providing their name or ID number",
      "endpoint": "https://pokeapi.co/api/v2/ability",
      "schema": {
        "type": "object",
        "properties": {
          "pokemon": {
            "type": "string",
            "description": "Pokemon name or ID number"
          }
        },
        "required": ["pokemon"]
      },
      "examples": [
        {
          "pokemon": "pikachu"
        },
        {
          "pokemon": "charizard"
        }
      ]
    }
  ],

*/
const zodFromJsonSchema = (schema: any, sourceId: string): z.ZodSchema => {
  // Convert JSON schema to Zod schema
  if (schema.type === 'object') {
    const shape: Record<string, z.ZodTypeAny> = {
      sourceId: z.literal(sourceId),
      ...Object.fromEntries(
        Object.entries(schema.properties || {}).map(([key, value]: [string, any]) => [
          key,
          value.type === 'string' ? z.string() : z.any()
        ])
      )
    };
    const baseSchema = z.object(shape);
    return schema.required ? 
      baseSchema.required(['sourceId' as const, ...(schema.required as const[])]) : 
      baseSchema.required(['sourceId' as const]);
  }
  return z.any();
};

export const dataSourceRenderers = {
  api: ({ id, name, description, endpoint, headers, params, schema, examples }) => {
    const requiredParams = {
      id,
      name,
      description,
      endpoint,
      schema,
      examples
    };
    
    const missing = Object.entries(requiredParams)
      .filter(([_, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      throw new Error(`Data source ${id || 'unknown'} is missing required parameters: ${missing.join(', ')}`);
    }

    const zodSchema = zodFromJsonSchema(schema, id);

    return (
      <>
        <APIDataSource
          id={id}
          name={name}
          description={description}
          endpoint={endpoint}
          headers={headers}
          params={params}
          schema={zodSchema}
          examples={examples}
        />
        {/* APIDataSourceManager Action, maybe i can merge this action within the APIDataSource */}
        <Action
          type={name}
          description={description}
          schema={zodSchema}
          examples={examples}
          handler={async (e: PendingActionEvent) => {
          const { message, agent } = e.data;
          const { args } = message;

          try {
            // Query the data source
            const data = await agent.agent.dataSourceManager.pullFromDataSource(
              args.sourceId, 
              args
            );

            console.log('data: ', data);

            // Analyze and summarize the data
            const dataSummary = await agent.complete([
              {
                role: 'user',
                content: dedent`\
                  Analyze and summarize the following data from ${args.sourceId}:
                  \`\`\`
                  ${JSON.stringify(data, null, 2)}
                  \`\`\`

                  Context for why this data was queried: ${args.reason}
                  
                  Provide a concise summary focusing on the most relevant and interesting information.
                `,
              },
            ], {
              model: agent.agent.smallModel,
            });

            console.log('data summary: ', dataSummary);
            // Store the learned information in memory
            await agent.agent.addMemory(
              `Learned from ${args.sourceId}: ${dataSummary.content}`,
              {
                sourceId: args.sourceId,
                query: args.args,
                rawData: data,
                summary: dataSummary.content,
                timestamp: Date.now(),
                reason: args.reason
              }
            );

            await e.commit();
          } catch (error) {
            console.error('Error in queryAndLearn:', error);
            throw error;
          }
        }}
        />
      </>
    );
  },
};