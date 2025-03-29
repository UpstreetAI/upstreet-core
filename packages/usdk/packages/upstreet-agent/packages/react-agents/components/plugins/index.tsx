import React from 'react';
import { Action, useEnv } from 'react-agents';
import { z } from 'zod';
import util from 'util';
import type {
  IActionHandlerCallbackArgs,
  IPlugin,
  IAdapter,
  IRuntime,
} from '../types/eliza.d.ts';
import { ThreeDGenerationPlugin } from '@elizaos/plugin-3d-generation';
import { imageGenerationPlugin } from '@elizaos/plugin-image-generation';
import { videoGenerationPlugin } from '@elizaos/plugin-video-generation';
import { nftGenerationPlugin } from '@elizaos/plugin-nft-generation';
import echoChamberPlugin from '@elizaos/plugin-echochambers';
import gitbookPlugin from '@elizaos/plugin-gitbook';
import intifacePlugin from '@elizaos/plugin-intiface';
import { webSearchPlugin } from '@elizaos/plugin-web-search';
import evmPlugin from '@elizaos/plugin-evm';
import { zgPlugin } from '@elizaos/plugin-0g';
import icpPlugin from '@elizaos/plugin-icp';
import abstractPlugin from '@elizaos/plugin-abstract';
import avalanchePlugin from '@elizaos/plugin-avalanche';
import aptosPlugin from '@elizaos/plugin-aptos';
import { bootstrapPlugin } from '@elizaos/plugin-bootstrap';
import { confluxPlugin } from '@elizaos/plugin-conflux';
import cronosZkEVMPlugin from '@elizaos/plugin-cronoszkevm';
import { solanaPlugin } from '@elizaos/plugin-solana';
import starknetPlugin from '@elizaos/plugin-starknet';
import multiversxPlugin from '@elizaos/plugin-multiversx';
import nearPlugin from '@elizaos/plugin-near';
import { teePlugin } from '@elizaos/plugin-tee';
import tonPlugin from '@elizaos/plugin-ton';
import { TrustScoreDatabase } from '@elizaos/plugin-trustdb';
import { twitterPlugin } from '@elizaos/plugin-twitter';
import { plugins as coinbasePlugins } from '@elizaos/plugin-coinbase';
import suiPlugin from '@elizaos/plugin-sui';
import fereProPlugin from '@elizaos/plugin-ferePro';
import flowPlugin from '@elizaos/plugin-flow';
import fuelPlugin from '@elizaos/plugin-fuel';
import storyPlugin from '@elizaos/plugin-story';
import zksyncEraPlugin from '@elizaos/plugin-zksync-era';
import createGoatPlugin from '@elizaos/plugin-goat';
import { WhatsAppPlugin } from '@elizaos/plugin-whatsapp';

function generateZodSchema(obj: any): z.ZodTypeAny {
  if (typeof obj === "string") return z.string();
  if (typeof obj === "number") return z.number();
  if (typeof obj === "boolean") return z.boolean();
  if (Array.isArray(obj)) {
    return z.array(generateZodSchema(obj[0] || z.any()));
  }
  if (typeof obj === "object" && obj !== null) {
    const shape: Record<string, z.ZodTypeAny> = {};
    for (const key in obj) {
      shape[key] = generateZodSchema(obj[key]);
    }
    return z.object(shape);
  }
  return z.any();
}

//

const Plugin = (props: {
  plugin: IPlugin;
  opts: any;
}) => {
  const {
    plugin,
    opts,
  } = props;
  const env = useEnv();
  return (
    <>
      {(plugin.actions ?? []).map((action: any) => {
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
          const schema = generateZodSchema(examples[0]);
          // console.log('got schema', schema);
          return (
            <Action
              type={action.name}
              description={action.description}
              schema={schema}
              examples={examples}
              handler={async e => {
                const { args } = e.data.message; 
                console.log('got handler', args);

                await new Promise((resolve, reject) => {
                  const runtime: IRuntime = {
                    getSetting(key: string) {
                      return env[key];
                    },
                  };
                  const message = {
                    content: args,
                  }
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
                  console.log('call action handler', action.handler);
                  action.handler(runtime, message, state, options, callback);
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
const pluginWrap = (plugin: IPlugin) => (opts: any) => {
  console.log('render plugin', util.inspect(plugin, {
    depth: 7,
  }));
  return (
    <Plugin plugin={plugin} opts={opts} />
  );
};
const pluginWrapObject = (plugins: {
  [key: string]: IPlugin;
}) => (props: any) => {
  return (
    <>
      {Object.keys(plugins).map((key) => {
        const value = plugins[key];
        const Plugin = pluginWrap(value);
        return (
          <Plugin plugin={value} key={key} />
        );
      })}
    </>
  );
};
const adapterWrap = (adapter: IAdapter) => (props: any) => {
  console.log('load adapter', adapter);
  return null;
};

// const goatPlugin = awaitcreateGoatPlugin(function getSetting(key: string) {
//   return '';
// });
export const plugins = {
  '@elizaos/plugin-3d-generation': pluginWrap(ThreeDGenerationPlugin),
  '@elizaos/plugin-image-generation': pluginWrap(imageGenerationPlugin),
  '@elizaos/plugin-video-generation': pluginWrap(videoGenerationPlugin),
  '@elizaos/plugin-nft-generation': pluginWrap(nftGenerationPlugin),
  '@elizaos/plugin-echochambers': pluginWrap(echoChamberPlugin),
  '@elizaos/plugin-gitbook': pluginWrap(gitbookPlugin),
  '@elizaos/plugin-intiface': pluginWrap(intifacePlugin),
  '@elizaos/plugin-evm': pluginWrap(evmPlugin),
  '@elizaos/plugin-0g': pluginWrap(zgPlugin),
  '@elizaos/plugin-icp': pluginWrap(icpPlugin),
  '@elizaos/plugin-abstract': pluginWrap(abstractPlugin),
  '@elizaos/plugin-avalanche': pluginWrap(avalanchePlugin),
  '@elizaos/plugin-aptos': pluginWrap(aptosPlugin),
  '@elizaos/plugin-bootstrap': pluginWrap(bootstrapPlugin),
  '@elizaos/plugin-conflux': pluginWrap(confluxPlugin),
  '@elizaos/plugin-cronoszkevm': pluginWrap(cronosZkEVMPlugin),
  '@elizaos/plugin-solana': pluginWrap(solanaPlugin),
  '@elizaos/plugin-starknet': pluginWrap(starknetPlugin),
  '@elizaos/plugin-multiversx': pluginWrap(multiversxPlugin),
  '@elizaos/plugin-near': pluginWrap(nearPlugin),
  '@elizaos/plugin-tee': pluginWrap(teePlugin),
  '@elizaos/plugin-ton': pluginWrap(tonPlugin),
  '@elizaos/plugin-twitter': pluginWrap(twitterPlugin),
  '@elizaos/plugin-coinbase': pluginWrapObject(coinbasePlugins),
  '@elizaos/plugin-sui': pluginWrap(suiPlugin),
  '@elizaos/plugin-ferePro': pluginWrap(fereProPlugin),
  '@elizaos/plugin-flow': pluginWrap(flowPlugin),
  '@elizaos/plugin-fuel': pluginWrap(fuelPlugin),
  '@elizaos/plugin-story': pluginWrap(storyPlugin),
  '@elizaos/plugin-web-search': pluginWrap(webSearchPlugin),
  '@elizaos/plugin-zksync-era': pluginWrap(zksyncEraPlugin),
  '@elizaos/plugin-trustdb': adapterWrap(TrustScoreDatabase),
  // '@elizaos/plugin-goat': pluginWrap(goatPlugin),
};