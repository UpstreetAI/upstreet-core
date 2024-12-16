import {
  // AgentObject,
  ActiveAgentObject,
  ActionMessage,
  MessageFilter,
  // PendingActionMessage,
  ActionMessageEventData,
  PlayableAudioStream,
  GetHashFn,
  MessageCache,
} from '../types'
import { SceneObject } from '../classes/scene-object';
import { Player } from 'react-agents-client/util/player.mjs';
import { ExtendableMessageEvent } from '../util/extendable-message-event';
import { MessageCache as MessageCacheConstructor, CACHED_MESSAGES_LIMIT } from './message-cache';
import { loadMessagesFromDatabase } from '../util/loadMessagesFromDatabase';

//

export class ConversationObject extends EventTarget {
  agent: ActiveAgentObject; // the current agent
  agentsMap: Map<string, Player>; // note: agents does not include the current agent
  scene: SceneObject | null;
  getHash: GetHashFn; // XXX this can be a string, since conversation hashes do not change (?)
  messageCache: MessageCache;
  numTyping: number = 0;
  mentionsRegex: RegExp | null = null;

  constructor({
    agent,
    agentsMap = new Map(),
    scene = null,
    getHash = () => '',
    mentionsRegex = null,
  }: {
    agent: ActiveAgentObject | null;
    agentsMap?: Map<string, Player>;
    scene?: SceneObject | null;
    getHash?: GetHashFn;
    mentionsRegex?: RegExp | null;
  }) {
    super();

    this.agent = agent;
    this.agentsMap = agentsMap;
    this.scene = scene;
    this.getHash = getHash;
    this.mentionsRegex = mentionsRegex;
    this.messageCache = new MessageCacheConstructor({
      loader: async () => {
        const supabase = this.agent.appContextValue.useSupabase();
        const messages = await loadMessagesFromDatabase({
          supabase,
          conversationId: this.getKey(),
          agentId: this.agent.id,
          limit: CACHED_MESSAGES_LIMIT,
        });
        return messages;
      },
    });
  }

  //

  async typing(fn: () => Promise<void>) {
    const start = () => {
      if (++this.numTyping === 1) {
        this.dispatchEvent(new MessageEvent('typingstart', {
          data: null,
        }));
      }
    };
    const end = () => {
      if (--this.numTyping === 0) {
        this.dispatchEvent(new MessageEvent('typingend', {
          data: null,
        }));
      }
    };
    start();
    try {
      return await fn();
    } finally {
      end();
    }
  }

  //

  getScene() {
    return this.scene;
  }
  setScene(scene: SceneObject | null) {
    this.scene = scene;
  }

  getAgent() {
    return this.agent;
  }
  // setAgent(agent: ActiveAgentObject) {
  //   this.agent = agent;
  // }

  getAgents() {
    return Array
      .from(this.agentsMap.values());
  }
  getAgentIds() {
    return Array
      .from(this.agentsMap.keys());
  }
  addAgent(agentId: string, player: Player) {
    this.agentsMap.set(agentId, player);
  }
  removeAgent(agentId: string) {
    this.agentsMap.delete(agentId);
  }

  getKey() {
    return this.getHash();
  }

  #getAllMessages() {
    return this.messageCache.getMessages();
  }
  #getAllAgents() {
    const allAgents: object[] = [
      ...Array.from(this.agentsMap.values()).map(player => player.playerSpec),
    ];
    this.agent && allAgents.push(this.agent.agentJson);
    return allAgents;
  }
  getEmbeddingString() {
    const allMessages = this.#getAllMessages();
    const allAgents = this.#getAllAgents();

    return [
      allMessages.map(m => {
        return `${m.name}: ${m.method} ${JSON.stringify(m.args)}`;
      }),
      JSON.stringify(allAgents),
    ].join('\n');
  }

  getCachedMessages(filter?: MessageFilter) {
    const agent = filter?.agent;
    const idMatches = agent?.idMatches;
    const capabilityMatches = agent?.capabilityMatches;
    const query = filter?.query;
    const before = filter?.before;
    const after = filter?.after;
    const limit = filter?.limit;

    if (query) {
      throw new Error('query is not supported in cached messages');
    }

    const filterFns: ((m: ActionMessage) => boolean)[] = [];
    if (Array.isArray(idMatches)) {
      filterFns.push((m: ActionMessage) => {
        return idMatches.includes(m.userId);
      });
    }
    if (Array.isArray(capabilityMatches)) {
      // XXX implement this to detect e.g. voice capability
    }
    if (before instanceof Date) {
      filterFns.push((m: ActionMessage) => {
        return m.timestamp < before;
      });
    }
    if (after instanceof Date) {
      filterFns.push((m: ActionMessage) => {
        return m.timestamp > after;
      });
    }
    let messages = this.messageCache.getMessages();
    messages = messages.filter(m => filterFns.every(fn => fn(m)));
    if (typeof limit === 'number' && limit > 0) {
      messages = messages.slice(-limit);
    }
    return messages;
  }

  // format message for prompt
  formatMessage(message: string) {
    const mentions = this.getMessageMentions(message);
    if (mentions) {
      mentions.forEach(mentionId => {
        for (const [userId, player] of this.agentsMap.entries()) {
          const playerSpec = player.getPlayerSpec();
          if (playerSpec && playerSpec.mentionId === mentionId) {
            message = message.replace(new RegExp(`<@${mentionId}>`, 'g'), `@${userId}`);
            break;
          }
        }
      });
    }
    return message;
  }

  getMessageMentions(message: string) {
    if (!this.mentionsRegex) {
      return null;
    }
    const matches = message.match(this.mentionsRegex);
    if (!matches) return null;
    
    // extract just the ID numbers from <@ID> format
    return matches.map(mention => 
      mention.replace(/[<@>]/g, '')
      ).filter(Boolean);
  }
  /* async fetchMessages(filter: MessageFilter, {
    supabase,
    signal,
  }: {
    supabase: any;
    signal: AbortSignal;
  }) {
    const agent = filter?.agent;
    const idMatches = agent?.idMatches;
    const capabilityMatches = agent?.capabilityMatches;
    const query = filter?.query;
    const before = filter?.before;
    const after = filter?.after;
    const limit = filter?.limit;

    // XXX implement this to go to the database. support query via embedding.
    throw new Error('not implemented');

    return [] as ActionMessage[];
  } */

  // handle a message from the network
  async addLocalMessage(message: ActionMessage) {
    const {
      hidden,
    } = message;
    if (!hidden) {
      await this.messageCache.pushMessage(message);
    }

    const { userId } = message;
    const player = this.agentsMap.get(userId) ?? null;
    const playerSpec = player?.getPlayerSpec() ?? null;
    if (!playerSpec) {
      console.log('got local message for unknown agent', {
        message,
        agentsMap: this.agentsMap,
      }, new Error().stack);
    }

    const e = new ExtendableMessageEvent<ActionMessageEventData>('localmessage', {
      data: {
        agent: playerSpec,
        message,
      },
    });
    this.dispatchEvent(e);
    return await e.waitForFinish();
  }
  // send a message to the network
  async addLocalAndRemoteMessage(message: ActionMessage) {
    const {
      hidden,
    } = message;
    if (!hidden) {
      await this.messageCache.pushMessage(message);
    }

    const e = new ExtendableMessageEvent<ActionMessageEventData>('remotemessage', {
      data: {
        message,
      },
    });
    this.dispatchEvent(e);
    return await e.waitForFinish();
  }

  addAudioStream(audioStream: PlayableAudioStream) {
    this.dispatchEvent(
      new MessageEvent('audiostream', {
        data: {
          audioStream,
        },
      }),
    );
  }
}
