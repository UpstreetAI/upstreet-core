import React, { useEffect, useState } from 'react';
import { Action, useEnv, useRuntime } from 'react-agents';
import { jsonSchemaToZod } from 'json-schema-to-zod-object';
import { printNode, zodToTs } from 'zod-to-ts';
import { z, ZodTypeAny } from 'zod';
import type {
  IActionHandlerCallbackArgs,
  IPlugin,
  IAdapter,
  IRuntime,
} from '../types/eliza.d.ts';

function generateZodSchemaFromExample(obj: any): z.ZodTypeAny {
  if (typeof obj === "string") return z.string();
  if (typeof obj === "number") return z.number();
  if (typeof obj === "boolean") return z.boolean();
  if (Array.isArray(obj)) {
    return z.array(generateZodSchemaFromExample(obj[0] || z.any()));
  }
  if (typeof obj === "object" && obj !== null) {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const key in obj) {
      shape[key] = generateZodSchemaFromExample(obj[key]);
    }
    return z.object(shape);
  }
  return z.any();
}
function formatParameters({
  pluginParameters,
  pluginEnv,
  parameters,
  env,
}: {
  pluginParameters: object; // JSON schema
  pluginEnv: object; // key-value object mapping the environment variable name to the parameter name (must appear in pluginParameters)
  parameters: object; // key-value object contaning parameters, must match JSON schema with zod
  env: object; // key-value object of the current env, for mapping env, via pluginEnv, to the parameters. second preference to parameters
}) {
  // Generate zod schema from plugin parameters JSON schema
  const zodSchema = jsonSchemaToZod(pluginParameters);

  // Create merged parameters object, with env values as fallback
  const mergedParameters = {...parameters};
  if (pluginEnv) {
    for (const [envKey, paramName] of Object.entries(pluginEnv)) {
      if (env[envKey] && !mergedParameters.hasOwnProperty(paramName)) {
        mergedParameters[paramName] = env[envKey];
      }
    }
  }

  // Validate parameters against schema
  try {
    const parsed = zodSchema.parse(mergedParameters);
    // console.log('got parsed', {
    //   mergedParameters,
    //   parsed,
    // });
  } catch (err) {
    throw new Error(`Invalid plugin parameters: ${err.message}`);
  }

  return mergedParameters;
}

//

type PluginProps = {
  plugin?: IPlugin;
  name?: string;
  parameters: any;
};
export const Plugin: React.FC<PluginProps> = (props: PluginProps) => {
  const {
    // plugin,
    name,
    parameters,
  } = props;
  // if (!plugin && !name) {
  //   throw new Error('Plugin or name must be provided');
  // }

  // const [localPluginPromise, setLocalPluginPromise] = useState(false);
  const [localPlugin, setLocalPlugin] = useState<IPlugin | null>(null);
  const [localPluginPackageJson, setLocalPluginPackageJson] = useState<any | null>(null);
  useEffect(() => {
    if (name) {
      let live = true;
      (async () => {
        // const {
        //   promise: pluginPromise,
        //   resolve: pluginResolve,
        //   reject: pluginReject,
        // } = Promise.withResolvers<IPlugin | null>();
        // setLocalPluginPromise(true);

        const [
          pluginDefault,
          pluginPackageJson,
        ] = await Promise.all([
          (async () => {
            let plugin = await globalThis.dynamicImport(name);
            // console.log('got plugin', plugin);
            if (typeof plugin === 'function') {
              plugin = await plugin({
                runtime,
              });
            }
            return plugin;
          })(),
          (async () => {
            const packageJson = await globalThis.dynamicImport(`${name}/package.json`);
            return packageJson;
          })(),
        ]);
        // pluginResolve(pluginDefault);
        if (!live) return;
        // console.log('load plugin', name);

        // console.log('plugin setState', {
        //   pluginDefault,
        //   pluginPackageJson,
        // });

        setLocalPlugin(pluginDefault);
        setLocalPluginPackageJson(pluginPackageJson);
      })();
      return () => {
        // console.log('cancel', name);
        live = false;
      };
    }
  }, [
    // plugin,
    name,
  ]);
  const env = useEnv();
  const runtime = useRuntime();

  // console.log('render local plugin', localPlugin);

  return localPlugin && localPluginPackageJson && (
    <>
      {(localPlugin.actions ?? []).map((action: any) => {
        const examples = action.examples.map(exampleMessages => {
          const agentMessages = exampleMessages.filter(message => {
            return /agentName/.test(message.user);
          });
          if (agentMessages.length > 0) {
            const agentMessage = agentMessages[0];
            const {
              action,
              ...args
            } = agentMessage.content;
            return args;
          } else {
            return null;
          }
        }).filter(Boolean);
        // console.log('got examples', examples);
        if (examples.length > 0) {
          const schema = generateZodSchemaFromExample(examples[0]);
          // console.log('got schema', schema);
          return (
            <Action
              type={action.name}
              description={action.description}
              schema={schema}
              examples={examples}
              handler={async e => {
                const { args } = e.data.message; 
                // console.log('got handler', args);

                await new Promise((resolve, reject) => {
                  const parameters2 = formatParameters({
                    pluginParameters: localPluginPackageJson.pluginParameters,
                    pluginEnv: localPluginPackageJson.pluginEnv,
                    parameters,
                    env,
                  });
                  const message = {
                    content: args,
                  };
                  const state = {};
                  const options = {};
                  const callback = (result: IActionHandlerCallbackArgs) => {
                    console.log('got callback result', result);
                    const {
                      text,
                      error,
                      attachments,
                    } = result;
                    resolve(null);
                  };
                  const opts = {
                    runtime,
                    parameters: parameters2,
                    message,
                    state,
                    options,
                    callback,
                  };
                  console.log('call action handler', action.handler);
                  action.handler(opts);
                });
              }}
              key={action.name}
            />
          );
        } else {
          return null;
        }
      }).filter(Boolean)}
    </>
  );
};