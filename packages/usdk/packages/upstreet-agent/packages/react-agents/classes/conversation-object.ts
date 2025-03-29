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

    this.agent && allAgents.push(this.agent.config);
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

  /**
   * Formats incoming message mentions by replacing platform-specific mention patterns
   * with a standardized @userId format. This is useful for ensuring consistency
   * in how mentions are injected into the prompt across different platforms.
   * 
   * Example:
   * If the incoming message contains a mention like "<@mentionId>", and the corresponding
   * userId is "1234", the function will replace "<@mentionId>" with "@1234".
   * 
   * @param {string} message - The incoming message containing potential mentions.
   * @returns {string} - The message with mentions formatted to @userId.
   */
  formatIncomingMessageMentions(message: string): string {
    const mentions = this.getIncomingMessageMentions(message);
    if (mentions) {
      mentions.forEach(mentionId => {
        for (const [userId, player] of this.agentsMap.entries()) {
          const playerSpec = player.getPlayerSpec();
          if (playerSpec && playerSpec.mentionId === mentionId) {
            // Create a regex pattern by replacing the named capture group with the actual mentionId
            const mentionPattern = this.mentionsRegex.source
              .replace(/\(\?<id>[^)]+\)/, mentionId);
            
            message = message.replace(
              new RegExp(mentionPattern, 'g'), 
              `@${userId}`
            );
            break;
          }
        }
      });
    }
    return message;
  }

  /**
   * Extracts user IDs from the agent's outgoing "say" message using the @userId format.
   * This function identifies all mentions in the message that follow the @userId pattern
   * and returns an array of user IDs without the "@" symbol.
   * 
   * @param {string} message - The message containing potential @userId mentions.
   * @returns {string[] | null} - An array of user IDs or null if no matches are found.
   */
  getOutgoingMessageMentions(message: string): string[] | null {
    const matches = message.match(/@(\w+)/g);
    if (!matches) return null;
    
    const result = matches.map(mention => 
      mention.substring(1)
    ).filter(Boolean);
    return result;
  }

  /**
   * Formats outgoing message of the agent containing @userId mentions to platform-specific patterns.
   * This function replaces mentions in the @userId format with platform-specific
   * mention patterns using the mentionId from the player's specification.
   * 
   * @param {string} message - The message containing @userId mentions.
   * @returns {string} - The message with mentions formatted for the platform.
   */
  formatOutgoingMessageMentions(message: string): string {
    // Extract usernames from @mentions in the message
    const matches = message.match(/@(\w+)/g);
    if (!matches || !this.mentionsRegex) return message;

    matches.forEach(match => {
      const name = match.substring(1); // Remove @ symbol
      
      // Find player with matching username
      for (const player of this.agentsMap.values()) {
        const playerSpec = player.getPlayerSpec();
        if (playerSpec?.name === name && playerSpec.mentionId) {
          // Replace @username with platform-specific mention format
          const mentionFormat = this.mentionsRegex.source
            .replace(/\(\?<id>[^)]+\)/, playerSpec.mentionId);
          
          const sanitizedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

          message = message.replace(
            new RegExp(`@${sanitizedName}`, 'g'),
            mentionFormat
          );
          break;
        }
      }
    });

    return message;
  }

  /**
   * Extracts mention IDs from an incoming message to the agent using a regex pattern.
   * This function uses the mentionsRegex to find all mentions in the message
   * and returns an array of mention IDs extracted from the named capture group.
   * 
   * @param {string} message - The incoming message containing potential mentions.
   * @returns {string[] | null} - An array of mention IDs or null if no matches are found.
   */
  getIncomingMessageMentions(message: string): string[] | null {
    if (!this.mentionsRegex) return null;
    
    // Match the regex pattern and extract the id from the named capture group
    return Array.from(message.matchAll(this.mentionsRegex), 
      match => match.groups?.id
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
