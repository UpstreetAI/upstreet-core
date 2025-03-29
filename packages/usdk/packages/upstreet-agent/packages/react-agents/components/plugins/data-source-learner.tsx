import React from 'react';
import { Action } from '../core/action';
import { Prompt } from '../core/prompt';
import { useAgent } from '../../hooks';
import { z } from 'zod';
import dedent from 'dedent';
import type { PendingActionEvent } from '../../types';
import { AutoTask } from './auto-task';
import { ConversationProvider } from '../core/conversation';
import { RAGMemory } from './rag-memory';

export const DataSourceLearner: React.FC = () => {
  const agent = useAgent();

  return (
    <>
      <Prompt>
        {dedent`\
          # Data Source Learning System
          
          You can learn from available data sources and store the knowledge in your memory.
          Use the queryAndLearn action when you need to:
          - Gather new information about a topic
          - Verify or update your existing knowledge
          - Get real-time data for user queries
          
          Available data sources:
          ${agent.dataSourceManager.getAllDataSources().map(source => dedent`
            - ${source.name} (ID: ${source.id})
              ${source.description}
              REQUIRED: You must include these arguments in your query:
              ${source.requiredArgs?.map(arg => `  - '${arg}': (string) REQUIRED`)
                .join('\n') || '  - No required arguments'}`).join('\n')}

          NOTE: Queries will fail if required arguments are not provided!
        `}
      </Prompt>

      {/* add the RAG Memory Component */}
      <ConversationProvider>
        <RAGMemory chunkMessages={10} refreshMemoryEveryNMessages={1} />
      </ConversationProvider>
      
      {/* Add AutoTask for Self-learning from the data sources */}
      <AutoTask hint="You are provided with data sources to help you learn and obtain knowledge. Use the data sources to learn and use the knowledge to answer the user's question." />
    </>
  );
};