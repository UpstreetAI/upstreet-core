import type { ZodTypeAny } from 'zod';
import type {
  ActionMessage,
  ChatMessages,
  SubtleAiImageOpts,
  PendingActionMessage,
  ReadableAudioStream,
  PlayableAudioStream,
  AgentThinkOptions,
  ActionMessageEventData,
  ActionStep,
} from '../types';
import {
  ConversationObject,
} from './conversation-object';
import {
  generateAgentActionStep,
  executeAgentActionStep,
} from '../runtime';
import {
  ActiveAgentObject,
} from './active-agent-object';
import { QueueManager } from 'queue-manager';
import { fetchChatCompletion, fetchJsonCompletion } from '../util/fetch.mjs';
import { formatConversationMessage } from '../util/message-utils';
import { chatEndpointUrl } from '../util/endpoints.mjs';

//

export class GenerativeAgentObject {
  // members
  agent: ActiveAgentObject;
  conversation: ConversationObject; // the conversation that this generative agent is bound to
  // state
  generativeQueueManager = new QueueManager();
  thinkCache: Array<ActionStep> = [];

  //
  
  constructor(
    agent: ActiveAgentObject,
    {
      conversation,
    }: {
      conversation: ConversationObject;
    },
  ) {
    this.agent = agent;
    this.conversation = conversation;
  }

  //

  get location() {
    return new URL(`${chatEndpointUrl}/rooms/${this.conversation.room}`);
  }

  //

  async embed(text: string) {
    return await this.agent.appContextValue.embed(text);
  }
  async complete(
    messages: ChatMessages,
    model?: string,
  ) {
    return await this.agent.appContextValue.complete(messages, {
      model: model ?? this.agent.model,
    });
  }
  async completeJson(
    messages: ChatMessages,
    format: ZodTypeAny,
    model?: string,
  ) {
    return await this.agent.appContextValue.completeJson(messages, format, {
      model: model ?? this.agent.model,
    });
  }
  async generateImage(prompt: string, opts?: SubtleAiImageOpts) {
    return await this.agent.appContextValue.generateImage(prompt, opts);
  }

  // methods

  // returns the ActionStep that the agent took
  async think(hint?: string, thinkOpts?: AgentThinkOptions) {
    await this.generativeQueueManager.waitForTurn(async () => {
      await this.conversation.typing(async () => {
        try {
          const step = await generateAgentActionStep(this, hint, thinkOpts);
          await executeAgentActionStep(this, step);

          this.thinkCache.push(step);
        } catch (err) {
          console.warn('think error', err);
        }
      });
    });
  }
  async generate(hint: string, schema?: ZodTypeAny) {
    // console.log('agent renderer generate 1');
    await this.conversation.typing(async () => {
      // console.log('agent renderer generate 2');
      try {
        const messages = [
          {
            role: 'user',
            content: hint,
          },
        ];
        const jwt = this.agent.appContextValue.useAuthToken();

        let pendingMessagePromise = schema
          ? fetchJsonCompletion({
              messages,
            }, schema, {
              jwt,
            })
          : fetchChatCompletion({
            messages,
          }, {
            jwt,
          });
        const pendingMessage = await pendingMessagePromise;
        // console.log('agent renderer generate 3');
        return pendingMessage;
      } catch (err) {
        console.warn('generate error', err);
      }
    });
    // console.log('agent renderer think 5');
  }
  async say(text: string) {
    await this.conversation.typing(async () => {
      // console.log('say text', {
      //   text,
      // });
      const timestamp = Date.now();
      const step = {
        action: {
          method: 'say',
          args: {
            text,
          },
          timestamp,
        },
      };
      await executeAgentActionStep(this, step);
    });
  }
  async monologue(text: string) {
    await this.conversation.typing(async () => {
      const step = await generateAgentActionStep(
        this,
        'Comment on the following:' + '\n' +
          text,
        {
          forceAction: 'say',
        },
      );
      await executeAgentActionStep(this, step);
    });
  }

  async addMessage(message: PendingActionMessage) {
    const newMessage = formatConversationMessage(message, {
      agent: this.agent,
    });
    return await this.conversation.addLocalAndRemoteMessage(newMessage);
  }

  addAudioStream(playableAudioStream: PlayableAudioStream) {
    this.conversation.addAudioStream(playableAudioStream);
  }
}