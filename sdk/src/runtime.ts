import React from 'react';
import dedent from 'dedent';
import 'localstorage-polyfill';
import { z } from 'zod';
import type { ZodTypeAny } from 'zod';
import { zodToTs, printNode } from 'zod-to-ts';
import ReactReconciler from 'react-reconciler';
import { parseCodeBlock } from './util/util.mjs';
import {
  Agent,
  Action,
  Formatter,
  Prompt,
  Parser,
  Perception,
  // Scheduler,
  Server,
  SceneObject,
  AgentObject,
  ActiveAgentObject,
  ExtendableMessageEvent,
  SubtleAi,
  TaskObject,
  TaskResult,
} from './components';
import { AppContext, EpochContext, ConfigurationContext } from './context';
import type {
  AppContextValue,
  ConfigurationContextValue,
  ActionMessages,
  PendingActionEvent,
  PendingActionMessage,
  PerceptionEvent,
  SubtleAiCompleteOpts,
  SubtleAiImageOpts,
  MemoryOpts,
  ChatMessage,
  ChatMessages,
  Memory,
  // SdkDefaultComponentArgs,
  AgentProps,
  ActionProps,
  PromptProps,
  FormatterProps,
  ParserProps,
  PerceptionProps,
  TaskProps,
  // SchedulerProps,
  ServerProps,
  UserHandler,
  TtsArgs,
  ChatArgs,
} from './types';

import { ConversationContext } from './classes/conversation-context';
import { RenderLoader } from './classes/render-loader';
import { fetchChatCompletion } from './util/fetch.mjs';
import * as DefaultComponents from './default-components.jsx';
import { aiProxyHost } from './util/endpoints.mjs';
import { lembed } from './util/embedding.mjs';
import { QueueManager } from './util/queue-manager.mjs';
import { makeAnonymousClient } from './util/supabase-client.mjs';
// import { UserHandler, AgentConsole } from 'sdk/types';
import { makePromise } from './util/util.mjs';
import { ActionHistoryQuery } from './types';
import { AutoVoiceEndpoint, VoiceEndpointVoicer } from './lib/voice-output/voice-endpoint-voicer.mjs';
import { createOpusReadableStreamSource } from './lib/multiplayer/public/audio/audio-client.mjs';
import { NetworkRealms } from "./lib/multiplayer/public/network-realms.mjs";

//

const defaultSampleRate = 48000;

//

const retry = async (fn: (() => any) | (() => Promise<any>), numRetries = 5) => {
  for (let i = 0; i < numRetries; i++) {
    try {
      const result = await fn();
      // if (result !== null) {
      return result;
      // } else {
      //   continue;
      // }
    } catch (err) {
      console.warn('retry error', err);
      continue;
    }
  }
  throw new Error(`failed after ${numRetries} retries`);
}

//

type ChildrenProps = {
  children: React.ReactNode[],
};
class ErrorBoundary extends React.Component<
  any,
  {
    hasError: boolean;
  }
> {
  props: ChildrenProps;
  state: {
    hasError: boolean,
  } = {
    hasError: false,
  };
  constructor(props: ChildrenProps) {
    super(props);
    this.props = props;
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: any) {
    // console.log('get derived state from error', error);
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error: any, info: any) {
    console.warn('renderer crashed', error, info);
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return React.createElement(React.Fragment);
    }

    return this.props.children;
  }
}
const ConfigurationComponent = ({
  children,
}: {
  children: React.ReactNode[],
}) => {
  const [configurationValue, setConfigurationValue] = React.useState(() => {
    const data = {};
    const result = {
      get: (key: string) => data[key],
      set: (key: string, value: any) => {
        data[key] = value;
        setConfigurationValue(result);
      },
    };
    return result;
  });

  return React.createElement(
    ConfigurationContext.Provider,
    {
      value: configurationValue,
    },
    children,
  );
};
const AppComponent = (props: any) => {
  const {
    userRender,
    AppContext,
    appContextValue,
    epochValue,
    topLevelRenderPromise,
    // needDefaultActions,
    // needDefaultPrompts,
    // needDefaultParsers,
    // needDefaultPerceptions,
    // needDefaultSchedulers,
    // needDefaultServers,
    ...rest
  } = props;

  React.useEffect(() => {
    topLevelRenderPromise.resolve(null);
  }, [topLevelRenderPromise]);

  const children = [React.createElement(userRender, rest)];
  // if (needDefaultActions) {
  //   children.push(React.createElement(DefaultComponents.DefaultActions));
  // }
  // if (needDefaultPrompts) {
  //   children.push(React.createElement(DefaultComponents.DefaultPrompts));
  // }
  // if (needDefaultParsers) {
  //   children.push(React.createElement(DefaultComponents.DefaultParsers));
  // }
  // if (needDefaultPerceptions) {
  //   children.push(React.createElement(DefaultComponents.DefaultPerceptions));
  // }
  // if (needDefaultSchedulers) {
  //   children.push(React.createElement(DefaultComponents.DefaultSchedulers));
  // }
  // if (needDefaultServers) {
  //   children.push(React.createElement(DefaultComponents.DefaultServers));
  // }

  // create and use the AppContext.Provider
  const result = React.createElement(
    ErrorBoundary,
    undefined,
    React.createElement(
      AppContext.Provider,
      {
        value: appContextValue,
      },
      React.createElement(
        ConfigurationComponent,
        null,
        React.createElement(
          EpochContext.Provider,
          {
            value: epochValue,
          },
          ...children,
        ),
      ),
    ),
  );
  return result;
};

// converts raw objects to classes
/* const bindObjectClasses = ({
  scene,
  agents,
  currentAgent,
  wallets,
  appContextValue,
}: {
  scene: SceneObject;
  agents: Array<AgentObject>;
  currentAgent: AgentObject;
  wallets: any;
  appContextValue: AppContextValue,
}) => {
  const sceneBound = new SceneObject(scene);
  const agentsBound = agents.map((agent) => new AgentObject(agent, {
    context: appContextValue,
  }));
  const currentAgentUnboundIndex = agentsBound.findIndex(agent => agent.id === currentAgent.id);
  const currentAgentBound = new ActiveAgentObject(agentsBound[currentAgentUnboundIndex], {
    wallets,
  });
  agentsBound.splice(currentAgentUnboundIndex, 1, currentAgentBound);

  return {
    scene: sceneBound,
    agents: agentsBound,
    currentAgent: currentAgentBound,
  };
}; */
const getActionByName = (actionRegistry: Map<symbol, ActionProps>, name: string) => {
  for (const action of Array.from(actionRegistry.values())) {
    if (action.name === name) {
      return action;
    }
  }
  return null;
};
const makeEpochUse = (getterFn: () => any) => () => {
  React.useContext(EpochContext); // re-render when epoch changes
  return getterFn();
};

//

export class AgentRenderer {
  agentRegistry: Map<symbol, AgentProps> = new Map();
  actionRegistry: Map<symbol, ActionProps> = new Map();
  formatterRegistry: Map<symbol, FormatterProps> = new Map();
  promptRegistry: Map<symbol, PromptProps> = new Map();
  parserRegistry: Map<symbol, ParserProps> = new Map();
  perceptionRegistry: Map<symbol, PerceptionProps> = new Map();
  taskRegistry: Map<symbol, TaskProps> = new Map();
  serverRegistry: Map<symbol, ServerProps> = new Map();

  rendered: boolean = false;

  env: object;
  userRender: UserHandler;
  conversationContext: ConversationContext;
  wallets: any;
  tasks: Map<any, TaskObject> = new Map();
  enabled: boolean;

  renderLoader: RenderLoader;
  appContextValue: AppContextValue;
  epochValue: number;

  // sceneBound: SceneObject;
  // agentsBound: Array<AgentObject>;
  // currentAgentBound: ActiveAgentObject;

  reconciler: any;
  root: any;

  renderQueueManager: QueueManager;

  constructor({
    env,
    userRender,
    conversationContext,
    wallets,
    enabled,
  }: {
    env: object;
    userRender: UserHandler;
    conversationContext: ConversationContext;
    wallets: any;
    enabled: boolean;
  }) {
    const self = this;

    // latch arguments
    this.env = env;
    this.userRender = userRender;
    this.conversationContext = conversationContext;
    this.wallets = wallets;
    this.enabled = enabled;

    // latch members
    const {
      agentRegistry,
      actionRegistry,
      promptRegistry,
      formatterRegistry,
      parserRegistry,
      perceptionRegistry,
      taskRegistry,
      serverRegistry,
    } = this;

    // create the app context
    const renderLoader = new RenderLoader();
    this.renderLoader = renderLoader;
    const subtleAi = new SubtleAi();
    const thinkQueueManager = new QueueManager();
    const appContextValue: AppContextValue = {
      // userRender,

      Agent,
      Action,
      Formatter,
      Prompt,
      Parser,
      Perception,
      Server,

      subtleAi,

      useAuthToken: () => {
        return (this.env as any).AGENT_TOKEN;
      },

      useScene: () => {
        return makeEpochUse(() => this.getScene())(); // XXX these need to be dynamically bound
      },
      useAgents: () => {
        return makeEpochUse(() => this.getAgents())();
      },
      useCurrentAgent: () => {
        return makeEpochUse(() => this.getCurrentAgent())();
      },

      useActions: () => {
        return makeEpochUse(() => Array.from(actionRegistry.values()))();
      },
      useFormatters: () => {
        return makeEpochUse(() => Array.from(formatterRegistry.values()))();
      },

      useActionHistory: (query?: ActionHistoryQuery) => {
        const filter = query?.filter;
        // console.log('use action history 1');
        const messages = makeEpochUse(() => conversationContext.getMessages(filter))();
        // console.log('use action history 2', messages);
        return messages;
      },
      useTts: (opts?: TtsArgs) => { // XXX memoize this
        const voiceEndpoint = (() => {
          if (opts?.voiceEndpoint) {
            return opts?.voiceEndpoint;
          } else {
            const agentJsonString = (env as any).AGENT_JSON as string;
            const agentJson = JSON.parse(agentJsonString);
            return agentJson?.voiceEndpoint;
          }
        })();
        const sampleRate = opts?.sampleRate ?? defaultSampleRate;
        if (voiceEndpoint) {
          const match = voiceEndpoint.match(/^([^:]+?):([^:]+?):([^:]+?)$/);
          if (match) {
            const [_, model, voiceName, voiceId] = match;
            const voiceEndpoint = new AutoVoiceEndpoint({
              model,
              voiceId,
            });
            const voiceEndpointVoicer = new VoiceEndpointVoicer({
              voiceEndpoint,
              // audioManager: null,
              sampleRate,
            });
            return {
              getAudioStream: (text: string, opts: any) => {
                const transformStream = voiceEndpointVoicer.getStream(text, opts);
                return transformStream.readable;
              },
            };
          } else {
            throw new Error('invalid voice endpoint: ' + voiceEndpoint);
          }
        } else {
          throw new Error('no voice endpoint');
        }
      },
      useChat: (opts?: ChatArgs) => {
        return {
          playAudioStream: (readableStream) => {
            const audioSource = createOpusReadableStreamSource({
              readableStream,
              // audioContext,
            });

            const virPlayerEndpointUrl = opts.endpointUrl;
            const virPlayerId = opts.playerId;

            const realms = new NetworkRealms({
              virPlayerEndpointUrl,
              playerId: virPlayerId,
              audioManager: null,
            });
            
            // XXX make this bind to the realms
            realms.addAudioSource(audioSource);

            audioSource.output.addEventListener('end', e => {
              realms.removeAudioSource(audioSource);
            });

            return {
              id: audioSource.id,
            };
          },
        };
      },

      // useLoad: renderLoader.useLoad.bind(renderLoader),

      registerAgent: (key: symbol, props: AgentProps) => {
        agentRegistry.set(key, props);
      },
      unregisterAgent: (key: symbol) => {
        agentRegistry.delete(key);
      },

      registerAction: (key: symbol, props: ActionProps) => {
        actionRegistry.set(key, props);
      },
      unregisterAction: (key: symbol) => {
        actionRegistry.delete(key);
      },
      registerPrompt: (key: symbol, props: PromptProps) => {
        promptRegistry.set(key, props);
      },
      unregisterPrompt: (key: symbol) => {
        promptRegistry.set(key, null);
      },
      registerFormatter: (key: symbol, props: FormatterProps) => {
        formatterRegistry.set(key, props);
      },
      unregisterFormatter: (key: symbol) => {
        formatterRegistry.delete(key);
      },
      registerParser: (key: symbol, props: ParserProps) => {
        parserRegistry.set(key, props);
      },
      unregisterParser: (key: symbol) => {
        parserRegistry.delete(key);
      },
      registerPerception: (key: symbol, props: PerceptionProps) => {
        perceptionRegistry.set(key, props);
      },
      unregisterPerception: (key: symbol) => {
        perceptionRegistry.delete(key);
      },
      registerTask: (key: symbol, props: TaskProps) => {
        taskRegistry.set(key, props);
      },
      unregisterTask: (key: symbol) => {
        taskRegistry.delete(key);
      },
      // registerScheduler: (key: symbol, props: SchedulerProps) => {
      //   schedulerRegistry.set(key, props);
      // },
      // unregisterScheduler: (key: symbol) => {
      //   schedulerRegistry.delete(key);
      // },

      registerServer: (key: symbol, props: ServerProps) => {
        serverRegistry.set(key, props);
      },
      unregisterServer: (key: symbol) => {
        serverRegistry.delete(key);
      },

      isEnabled: () => {
        return enabled;
      },

      addAction: async (
        agent: AgentObject,
        pendingActionMessage: PendingActionMessage,
      ) => {
        const { id: userId, name } = agent;
        const { method, args } = pendingActionMessage;
        const timestamp = new Date();
        const actionMessage = {
          userId,
          name,
          method,
          args,
          timestamp,
        };

        const currentAgent = conversationContext.getCurrentAgent();
        const isLocal = agent.id === (currentAgent as any).id;
        if (isLocal) {
          conversationContext.addLocalAndRemoteMessage(actionMessage);
        } else {
          // conversationContext.addLocalMessage(actionMessage);
          throw new Error('remote agent actions cannot be added here');
        }
        await self.rerenderAsync();
      },

      async think(agent: ActiveAgentObject, hint?: string) {
        await thinkQueueManager.waitForTurn(async () => {
          // console.log('agent renderer think 1');
          await conversationContext.typing(async () => {
            // console.log('agent renderer think 2');
            try {
              const pendingMessage = await (hint
                ? self.generateAgentActionFromInstructions(agent, hint)
                : self.generateAgentAction(agent)
              );
              // console.log('agent renderer think 3');
              await self.handleAgentAction(agent, pendingMessage);
              // console.log('agent renderer think 4');
            } catch (err) {
              console.warn('think error', err);
            }
          });
          // console.log('agent renderer think 5');
        });
      },

      async generate(agent: ActiveAgentObject, hint: string, schema?: ZodTypeAny) {
        // console.log('agent renderer think 1');
        await conversationContext.typing(async () => {
          // console.log('agent renderer think 2');
          try {
            const pendingMessage = await (schema
              ? self.generateJsonMatchingSchema(hint, schema)
              : self.generateString(hint)
            );
            // console.log('agent renderer think 3');
            // await self.handleAgentAction(agent, pendingMessage);
            // console.log('agent renderer think 4');
            return pendingMessage;
          } catch (err) {
            console.warn('generate error', err);
          }
        });
        // console.log('agent renderer think 5');
      },

      say: async (agent: ActiveAgentObject, text: string) => {
        await conversationContext.typing(async () => {
          console.log('say text', {
            text,
          });
          const timestamp = Date.now();
          const pendingMessage = {
            method: 'say',
            args: {
              text,
            },
            timestamp,
          }
          await self.handleAgentAction(agent, pendingMessage);
        });
      },
      monologue: async (agent: ActiveAgentObject, text: string) => {
        await conversationContext.typing(async () => {
          console.log('monologue text', {
            text,
          });
          const pendingMessage = await self.generateAgentActionFromInstructions(
            agent,
            'The next action should be the character commenting on the following:' +
              '\n' +
              text,
          );
          await self.handleAgentAction(agent, pendingMessage);
        });
      },

      embed: async (text: string) => {
        const embedding = await lembed(text);
        return embedding;
      },
      complete: async (messages, opts?: SubtleAiCompleteOpts) => {
        const currentAgent = conversationContext.getCurrentAgent();
        const { model = currentAgent.model } = opts ?? {};
        const jwt = (env as any).AGENT_TOKEN as string;
        localStorage.setItem('jwt', JSON.stringify(jwt));
        const content = await fetchChatCompletion({
          model,
          messages,
        });
        return {
          role: 'assistant',
          content,
        };
      },
      generateImage: async (prompt: string, opts?: SubtleAiImageOpts) => {
        const {
          model = 'dall-e-3',
          width = 1024, // [1024, 1792]
          height = 1024,
          quality = 'hd', // ['hd', 'standard']
        } = opts ?? {};
        const jwt = (env as any).AGENT_TOKEN as string;
        // localStorage.setItem('jwt', JSON.stringify(jwt));
        const u = `https://${aiProxyHost}/api/ai/images/generations`;
        const j = {
          prompt,
          model,
          size: `${width}x${height}`,
          quality,
          n: 1,
        };
        const res = await fetch(u, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${jwt}`,
          },
          body: JSON.stringify(j),
        });
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer();
          return arrayBuffer;
        } else {
          const json = await res.json();
          const { error } = json;
          console.log('got generate image error', error);
          throw new Error(`image generation error: ${error}`);
        }
      },
      getMemory: async (
        agent: AgentObject,
        query: string,
        opts?: MemoryOpts,
      ) => {
        console.log('app context value recall 1', {
          agent,
          query,
        });
        const embedding = await lembed(query);
        const { matchThreshold = 0.5, matchCount = 1 } = opts || {};

        const jwt = (env as any).AGENT_TOKEN as string;
        const supabase = makeAnonymousClient(env, jwt);
        const { data, error } = await supabase.rpc('match_memory_user_id', {
          user_id: agent.id,
          query_embedding: embedding,
          match_threshold: matchThreshold,
          match_count: matchCount,
        });
        if (!error) {
          console.log('app context value recall 2', {
            data,
          });
          return data as Array<Memory>;
        } else {
          throw new Error(error + '');
        }
      },
      addMemory: async (
        agent: ActiveAgentObject,
        text: string,
        content?: any,
        opts?: MemoryOpts,
      ) => {
        const { matchThreshold = 0.5, matchCount = 1 } = opts || {};

        const id = crypto.randomUUID();
        const embedding = await lembed(text);

        const jwt = (env as any).AGENT_TOKEN as string;
        const supabase = makeAnonymousClient(env, jwt);

        const readResult = await supabase.rpc('match_memory_user_id', {
          user_id: agent.id,
          query_embedding: embedding,
          match_threshold: matchThreshold,
          match_count: matchCount,
        });
        const { error, data } = readResult;
        if (!error) {
          const replaceIndexes = await (async () => {
            if (data) {
              const numRetries = 5;
              return await retry(async () => {
                const promptMessages = [
                  {
                    role: 'assistant',
                    content: dedent`
                      You are a memory relevance evaluator for an AI agent.
                      The user will provide an list of old memories and a new memory, as text strings.
                      Evaluate which memories the new memory should replace and reply with a list of the memory indexes that the new memory should replace from the list of old memories (splice). The indexes you should return are the 0-indexed position of the memory to replace. The replacement list you return may be the empty array.
                      For example, if the previous memories state that ["A is B", "C is D"], and the new memory states that "A is E", the replacement list would be [0].
                      When in doubt, keep the old memory and do not include it in the replacement list.
                      Wrap your response in code blocks e.g.
                      \`\`\`json
                      [0, 1, 2]
                      \`\`\`
                    `,
                  },
                  {
                    role: 'user',
                    content:
                      dedent`
                      # Old memories
                      \`\`\`` +
                      '\n' +
                      JSON.stringify(
                        data.map((memory) => memory.text),
                        null,
                        2,
                      ) +
                      '\n' +
                      dedent`
                      \`\`\`
                      # New memory
                      \`\`\`` +
                      '\n' +
                      JSON.stringify([text], null, 2) +
                      '\n' +
                      dedent`
                      \`\`\`
                      `,
                  },
                ];
                const message = await appContextValue.complete(promptMessages);
                // extract the code block
                const s = parseCodeBlock(message.content);
                // parse the json in the code block
                const rawJson = JSON.parse(s);
                // validate that the json matches the expected schema
                const schema = z.array(z.number());
                const parsedJson = schema.parse(rawJson);
                return parsedJson;
              }, numRetries);
            } else {
              return [];
            }
          })();

          const writeResult = await supabase
            .from('ai_memory')
            .insert({
              id,
              user_id: agent.id,
              text,
              embedding,
              content,
            });
          const { error: error2, data: data2 } = writeResult;
        } else {
          throw new Error(JSON.stringify(error));
        }
      },
    };
    this.appContextValue = appContextValue;
    subtleAi.context = appContextValue;

    // bind the objects
    // const bindingResult = bindObjectClasses({
    //   scene: conversationContext.getScene(),
    //   agents: conversationContext.getAgents().concat([
    //     conversationContext.getCurrentAgent(),
    //   ]),
    //   currentAgent: conversationContext.getCurrentAgent(),
    //   wallets,
    //   appContextValue,
    // });
    // const sceneBound = bindingResult.scene;
    // const agentsBound = bindingResult.agents;
    // const currentAgentBound = bindingResult.currentAgent;
    // this.sceneBound = sceneBound;
    // this.agentsBound = agentsBound;
    // this.currentAgentBound = currentAgentBound;

    // run the module to get the result
    const opts = {
      supportsMutation: true,
      isPrimaryRenderer: true,
      createInstance(...args: any[]) {
        // console.log('create instance', { args });
        return null;
      },
      createTextInstance: (...args: any[]) => {
        // console.log('create text instance', { args });
        return null;
      },
      getRootHostContext: () => null,
      prepareForCommit: () => null,
      resetAfterCommit: () => null,
      clearContainer: () => null,
      appendChildToContainer: () => null,
      removeChildFromContainer: () => null,
    } as any;
    const reconciler = ReactReconciler(opts);
    this.reconciler = reconciler;
    const container = {};
    const root = reconciler.createContainer(
      container, // containerInfo
      0, // tag
      null, // hydrationCallbacks
      true, // isStrictMode
      null, // concurrentUpdatesByDefaultOverride
      '', // identifierPrefix
      (err) => {
        console.warn('got recoverable error', err);
        // error = err;
        throw err;
      }, // onRecoverableError
      null, // transitionCallbacks
    );
    this.root = root;
    this.epochValue = 0;

    this.renderQueueManager = new QueueManager();
  }

  // setEnabled(enabled: boolean) {
  //   this.enabled = enabled;
  // }

  // bound object getters
  getScene() {
    const scene = this.conversationContext.getScene();
    const sceneBound = new SceneObject(scene);
    return sceneBound;
  }
  getAgents() {
    const currentAgent = this.conversationContext.getCurrentAgent();
    const agents = this.conversationContext.getAgents()
      .concat([currentAgent]);
    const { appContextValue, wallets } = this;

    // if (!appContextValue) {
    //   throw new Error('app context value not set');
    // }

    const agentsBound = agents.map((agent) => new AgentObject(agent, {
      context: appContextValue,
    }));
    const currentAgentUnboundIndex = agentsBound.findIndex(agent => agent.id === currentAgent.id);
    // if (currentAgentUnboundIndex === -1) {
    //   throw new Error('current agent not found in agents: ' + currentAgent.id + ' : ' + agentsBound.map(agent => agent.id).join(', '));
    // }
    const currentAgentBound = new ActiveAgentObject(agentsBound[currentAgentUnboundIndex], {
      wallets,
    });
    agentsBound.splice(currentAgentUnboundIndex, 1, currentAgentBound);
    return agentsBound;
  }
  getCurrentAgent() {
    const currentAgent = this.conversationContext.getCurrentAgent();
    const { appContextValue, wallets } = this;

    const currentAgentBound = new AgentObject(currentAgent, {
      context: appContextValue,
    });
    const currentActiveAgentBound = new ActiveAgentObject(currentAgentBound, {
      wallets,
    });
    return currentActiveAgentBound;
  }

  async generateAgentAction(agent: ActiveAgentObject) {
    const { promptRegistry } = this;
    const prompts = Array.from(promptRegistry.values())
      .map((prompt) => prompt?.children)
      .filter((prompt) => typeof prompt === 'string' && prompt.length > 0);
    const promptString = prompts.join('\n\n');
    // console.log('think 1', promptString);
    // console.log('think 2', {
    //   promptString,
    // });
    const promptMessages = [
      {
        role: 'user',
        content: promptString,
      },
    ];
    return await this.generateAgentActionFromMessages(promptMessages);
  }
  async generateAgentActionFromInstructions(
    agent: ActiveAgentObject,
    instructions: string,
  ) {
    const { promptRegistry } = this;
    const prompts = Array.from(promptRegistry.values())
      .map((prompt) => prompt?.children)
      .filter((prompt) => typeof prompt === 'string' && prompt.length > 0)
      .concat([instructions]);
    const promptString = prompts.join('\n\n');
    const promptMessages = [
      {
        role: 'user',
        content: promptString,
      },
    ];
    return await this.generateAgentActionFromMessages(promptMessages);
  }
  async generateAgentActionFromMessages(promptMessages: ChatMessages) {
    const { appContextValue, parserRegistry, actionRegistry } = this;

    const parser = Array.from(parserRegistry.values())[0];

    const numRetries = 5;
    return await retry(async () => {
      const completionMessage = await (async () => {
        const message = await appContextValue.complete(promptMessages);
        return message;
      })();
      if (completionMessage !== null) {
        let newMessage: PendingActionMessage = null;
        // try {
          newMessage = await parser.parseFn(completionMessage.content);
        // } catch (err) {}

        // if (newMessage) {
          const { method } = newMessage;
          const actionHandler = getActionByName(actionRegistry, method);
          if (actionHandler) {
            if (actionHandler.schema) {
              try {
                const schema = z.object({
                  method: z.string(),
                  args: actionHandler.schema,
                });
                const parsedMessage = schema.parse(newMessage);
              } catch (err) {
                console.warn('zod schema action parse error: ' + JSON.stringify(newMessage) + '\n' + JSON.stringify(err.issues));
              }
            }
            return newMessage;
          } else {
            throw new Error('no action handler found for method: ' + method);
          }
        // } else {
        //   return null;
        // }
      } else {
        return null;
      }
    }, numRetries);
  }

  async generateJsonMatchingSchema(hint: string, schema: ZodTypeAny) {
    const numRetries = 5;
    return await retry(async () => {
      const prompts = [
        dedent`
          Respond with the following:
        ` + '\n' + hint,
        dedent`
          Output the result as valid JSON matching the following schema:
        ` + '\n' + printNode(zodToTs(schema).node) + '\n' + dedent`
          Wrap your response in a code block e.g.
          \`\`\`json
          "...response goes here..."
          \`\`\`
        `,
      ];
      const promptString = prompts.join('\n\n');
      const promptMessages = [
        {
          role: 'user',
          content: promptString,
        },
      ];
      const completionMessage = await (async () => {
        const message = await this.appContextValue.complete(promptMessages);
        return message;
      })();
      // extract the json string
      const s = parseCodeBlock(completionMessage.content);
      // parse the json
      const rawJson = JSON.parse(s);
      // check that the json matches the schema
      const parsedJson = schema.parse(rawJson);
      return parsedJson;
    }, numRetries);
  }
  async generateString(hint: string) {
    const numRetries = 5;
    return await retry(async () => {
      const prompts = [
        dedent`
          Respond with the following:
        ` + '\n' + hint,
      ];
      const promptString = prompts.join('\n\n');
      const promptMessages = [
        {
          role: 'user',
          content: promptString,
        },
      ];
      const completionMessage = await (async () => {
        const message = await this.appContextValue.complete(promptMessages);
        return message;
      })();
      return completionMessage.content;
    }, numRetries);
  }

  async handleAgentAction(
    agent: ActiveAgentObject,
    newMessage: PendingActionMessage,
  ) {
    // console.log('handle agent action 1');
    const { actionRegistry } = this;

    const { method } = newMessage;
    const actionHandler = getActionByName(actionRegistry, method);
    // console.log('handle agent action 2', actionHandler);
    if (actionHandler) {
      // handle the pending action
      const e = new MessageEvent('pendingaction', {
        data: {
          agent,
          message: newMessage,
        },
      }) as PendingActionEvent;
      e.commit = async () => {
        // console.log('handle agent commit 1', newMessage);
        await agent.addAction(newMessage);
        // console.log('handle agent commit 2', newMessage);
      };
      // console.log('handle agent action 3', actionHandler);
      if (actionHandler.handler) {
        await actionHandler.handler(e);
      } else {
        await e.commit();
      }
      // console.log('handle agent action 4', actionHandler);
    } else {
      throw new Error('no action handler found for method: ' + method);
    }
  }

  async render(props: any) {
    props.topLevelRenderPromise = makePromise();
    this.renderLoader.clear();
    this.renderLoader.useLoad(props.topLevelRenderPromise);

    const element = React.createElement(AppComponent, props);
    await new Promise((accept, reject) => {
      this.reconciler.updateContainer(element, this.root, null, () => {
        accept(null);
      });
    });

    await this.renderLoader.waitForLoad();
  }
  async rerender() {
    const {
      userRender,
      appContextValue,
      conversationContext,
      wallets,

      // actionRegistry,
      // promptRegistry,
      // parserRegistry,
      // perceptionRegistry,
      // schedulerRegistry,
      // serverRegistry,
    } = this;

    const scene = conversationContext.getScene();
    const currentAgent = conversationContext.getCurrentAgent();
    const agents = conversationContext.getAgents().concat([currentAgent]);
    const messages = conversationContext.getMessages();

    this.epochValue++;

    const props = {
      userRender,
      AppContext,
      appContextValue,
      epochValue: this.epochValue,
      topLevelRenderPromise: null,
      scene,
      agents,
      currentAgent,
      messages,
      wallets,
      DefaultComponents,
      // needDefaultActions: false,
      // needDefaultPrompts: false,
      // needDefaultParsers: false,
      // needDefaultPerceptions: false,
      // needDefaultSchedulers: false,
      // needDefaultServers: false,
    };
    // console.log('render 1');
    await this.render(props);
    // console.log('render 2');

    /* let needsRerender = false;
    if (actionRegistry.size === 0) {
      props.needDefaultActions = true;
      needsRerender = true;
    }
    if (promptRegistry.size === 0) {
      props.needDefaultPrompts = true;
      needsRerender = true;
    }
    if (parserRegistry.size === 0) {
      props.needDefaultParsers = true;
      needsRerender = true;
    }
    if (perceptionRegistry.size === 0) {
      props.needDefaultPerceptions = true;
      needsRerender = true;
    }
    if (schedulerRegistry.size === 0) {
      props.needDefaultSchedulers = true;
      needsRerender = true;
    }
    if (serverRegistry.size === 0) {
      props.needDefaultServers = true;
      needsRerender = true;
    }
    if (needsRerender) {
      // console.log('render 3');
      await this.render(props);
      // console.log('render 4');
    } */

    this.rendered = true;
  }

  async rerenderAsync() {
    // console.log('rerender 1');
    await this.renderQueueManager.waitForTurn(async () => {
      // console.log('rerender 2');
      await this.rerender();
      // console.log('rerender 3');
    });
    // console.log('rerender 4');
  }

  // note: needs to be async to wait for React to resolves
  // this is used to e.g. fetch the chat history in user code
  async ensureOutput() {
    // const { conversationContext } = this;
    // const scene = conversationContext.getScene();
    // const currentAgent = conversationContext.getCurrentAgent();
    // const agents = conversationContext.getAgents().concat([currentAgent]);
    // const messages = conversationContext.getMessages();

    if (!this.rendered) {
      await this.rerenderAsync();
    }

    const {
      agentRegistry,
      actionRegistry,
      promptRegistry, 
      parserRegistry,
      perceptionRegistry,
      taskRegistry,
      // schedulerRegistry,
      serverRegistry,
    } = this;

    return {
      agentRegistry,
      actionRegistry,
      promptRegistry,
      parserRegistry,
      perceptionRegistry,
      taskRegistry,
      // schedulerRegistry,
      serverRegistry,
    };
  }
}
export const nudgeUserAgent = async ({
  // env,
  // console,
  // userRender,
  // conversationContext,
  // wallets,
  agentRenderer,
  // enabled,
}: {
  // env: object;
  // console: AgentConsole;
  // userRender: UserHandler;
  // conversationContext: ConversationContext;
  // wallets: any;q
  agentRenderer: AgentRenderer;
  // enabled: boolean;
}) => {
  const {
    agentRegistry,
    actionRegistry,
    promptRegistry,
    parserRegistry,
    perceptionRegistry,
    // schedulerRegistry,
    serverRegistry,
    // actions,
  } = await agentRenderer.ensureOutput();

  try {
    const nudgePerceptions = Array.from(perceptionRegistry.values()).filter(
      (perception) => perception.type === 'nudge',
    );
    const currentAgent = agentRenderer.getCurrentAgent();
    for (const nudgePerception of nudgePerceptions) {
      const e = new ExtendableMessageEvent('perception', {
        data: {
          agent: currentAgent,
          message: {
            method: 'nudge',
            args: {},
          },
        },
      }) as PerceptionEvent;
      await nudgePerception.handler(e);
    }
  } catch (err : any) {
    console.warn('got perception error', err?.stack ?? err);
    throw {
      code: 500,
      json: {
        error: err,
      },
    };
  }

  // return {
  //   actions,
  // };
};
type ServerHandler = {
  fetch(request: Request, env: object): Response | Promise<Response>;
};
export const compileUserAgentServer = async ({
  // env,
  // console,
  // userRender,
  // conversationContext,
  // wallets,
  agentRenderer,
  // enabled,
}: {
  // env: object;
  // console: AgentConsole;
  // userRender: UserHandler;
  // conversationContext: ConversationContext;
  // wallets: any;
  agentRenderer: AgentRenderer;
  // enabled: boolean;
}) => {
  const {
    agentRegistry,
    actionRegistry,
    promptRegistry,
    parserRegistry,
    perceptionRegistry,
    // schedulerRegistry,
    serverRegistry,
  } = await agentRenderer.ensureOutput();

  const serversProps = Array.from(serverRegistry.values());
  const servers = serversProps
    .map((serverProps) => {
      const childFn = serverProps.children as () => ServerHandler;
      if (typeof childFn === 'function') {
        const server = childFn();
        return server;
      } else {
        console.warn('server child is not a function', childFn);
        return null;
      }
    })
    .filter((server) => server !== null) as Array<ServerHandler>;

  return {
    async fetch(request: Request, env: object) {
      for (const server of servers) {
        // console.log('try server fetch 1', server.fetch.toString());
        const res = await server.fetch(request, env);
        // console.log('try server fetch 2', res);
        if (res instanceof Response) {
          return res;
        }
      }
      console.warn('no server handler found, so returning default 404');
      return new Response(
        JSON.stringify({
          error: `Not found: agent server handler (${servers.length} routes)`,
        }),
        {
          status: 404,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    },
  };
};

/* export const compileUserAgentAlarm = async ({
  agentRenderer,
}: {
  // env: object;
  // userRender: UserHandler;
  // conversationContext: ConversationContext;
  // wallets: any;
  agentRenderer: AgentRenderer;
  // enabled: boolean;
}) => {
  const {
    // agentRegistry,
    // actionRegistry,
    // promptRegistry,
    // parserRegistry,
    perceptionRegistry,
    // schedulerRegistry,
    // serverRegistry,
  } = await agentRenderer.ensureOutput();

  // find the earliest timeout
  const timeouts = await Promise.all(
    Array.from(schedulerRegistry.values()).map(async (schedulerProps) => {
      return await schedulerProps.scheduleFn();
    }),
  );
  let timeout;
  if (timeouts.length > 0) {
    timeout = Math.min(...timeouts);
  } else {
    timeout = Infinity;
  }
  const alarmSpec = {
    timeout,
    perceptionRegistry,
  };
  // console.log('returning alarm spec', alarmSpec);
  return alarmSpec;
}; */

export const compileUserAgentTasks = async ({
  agentRenderer,
}: {
  agentRenderer: AgentRenderer;
}) => {
  const {
    taskRegistry,
  } = await agentRenderer.ensureOutput();

  const update = async () => {
    const ensureTask = (id: any) => {
      const task = agentRenderer.tasks.get(id);
      if (task) {
        return task;
      } else {
        const task = new TaskObject({
          id,
        });
        agentRenderer.tasks.set(id, task);
        return task;
      }
    };
    const currentAgent = agentRenderer.getCurrentAgent();
    const makeTaskEvent = (task: TaskObject) => {
      return new ExtendableMessageEvent('task', {
        data: {
          agent: currentAgent,
          task,
        },
      });
    };

    // initialize and run tasks
    const seenTasks = new Set<any>();
    const now = new Date()
    await Promise.all(
      Array.from(taskRegistry.values()).map(async (taskProps) => {
        const { id } = taskProps;
        // console.log('got task props id 1', {
        //   id,
        // });
        const task = ensureTask(id);
        task.name = taskProps.name;
        task.description = taskProps.description;
        // console.log('got task props id 2', {
        //   id,
        //   name: task.name,
        //   description: task.description,
        // });
        if (!seenTasks.has(id)) {
          seenTasks.add(id);

          // console.log('check task timeout', {
          //   timestamp: task.timestamp,
          //   now,
          // });
          if (task.timestamp <= now) {
            // time to run the task
            const e = makeTaskEvent(task);
            let taskResult = null;
            let taskErr = null;
            let hadError = false;
            try {
              // console.log('task handler 1');
              taskResult = await taskProps.handler(e);
              // console.log('task handler 2');
              if (taskResult instanceof TaskResult) {
                // ok
              } else {
                throw new Error('task handler must return a TaskResult');
              }
            } catch (err) {
              taskErr = err;
              hadError = true;
            }
            if (!hadError) {
              const { type, args } = taskResult;
              switch (type) {
                case 'schedule': {
                  const { timestamp } = args;
                  task.timestamp = timestamp;
                  break;
                }
                case 'done': {
                  if (taskProps.onDone) {
                    task.timestamp = new Date(Infinity);
                    const e = makeTaskEvent(task);
                    taskProps.onDone && taskProps.onDone(e);
                  }
                  break;
                }
                default: {
                  throw new Error('unknown task result type: ' + type);
                }
              }
            } else {
              console.warn('task error: ' + taskErr);
            }
          } else {
            // else it's not time to run the task yet
          }
        } else {
          throw new Error('duplicate task id: ' + id);
        }
      }),
    );
    // filter to only the seen tasks
    for (const [id, task] of Array.from(agentRenderer.tasks.entries())) {
      if (!seenTasks.has(id)) {
        agentRenderer.tasks.delete(id);
      }
    }
    // compute the earliest timeout
    const timestamps = Array.from(agentRenderer.tasks.values()).map((task) => {
      return +task.timestamp;
    }).filter(n => !isNaN(n)).concat([Infinity]);
    const minTimestamp = Math.min(...timestamps);
    return minTimestamp;
  };
  return {
    update,
  };
};
