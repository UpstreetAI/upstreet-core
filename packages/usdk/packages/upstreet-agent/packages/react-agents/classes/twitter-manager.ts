import {
  // DiscordRoomSpec,
  // DiscordArgs,
  // ConversationEventData,
  ActiveAgentObject,
  // ExtendableMessageEvent,
  ActionMessageEvent,
  ActionMessageEventData,
  // PlayableAudioStream,
  TwitterArgs,
} from '../types';
import {
  ConversationObject,
} from './conversation-object';
// import { Player } from 'react-agents-client/util/player.mjs';
import { createMessageCache, formatConversationMessage } from '../util/message-utils';
import {
  bindConversationToAgent,
} from '../runtime';
import {
  QueueManager,
} from 'queue-manager';
// import uuidByString from 'uuid-by-string';
import { Player } from 'react-agents-client/util/player.mjs';

import { Client as TwitterClient } from 'twitter-api-sdk';

//

const makePlayerFromAuthor = (author: any) => {
  const { id, username } = author.data;
  const player = new Player(id, {
    name: username,
    // previewUrl: displayAvatarURL,
  });
  return player;
};

//

class TwitterBot {
  accessToken: string;
  refreshToken: string;
  clientId: string;
  abortController: AbortController;
  agent: ActiveAgentObject;
  kv: any;
  codecs: any;
  jwt: string;
  client: TwitterClient;
  conversations: Map<string, ConversationObject>; // tweetId -> conversation

  constructor(args: TwitterArgs) {
    const {
      token,
      agent,
      kv,
      codecs,
      jwt,
    } = args;

    if (!token) {
      throw new Error('Twitter bot requires a token');
    }
    const [accessToken, refreshToken, clientId] = token.split(':');
    if (!accessToken) {
      throw new Error('Twitter bot requires an access token');
    }
    if (!refreshToken) {
      throw new Error('Twitter bot requires a refresh token');
    }
    if (!clientId) {
      throw new Error('Twitter bot requires a client ID');
    }
    if (!agent) {
      throw new Error('Twitter bot requires an agent');
    }
    if (!codecs) {
      throw new Error('Twitter bot requires codecs');
    }
    if (!jwt) {
      throw new Error('Twitter bot requires a jwt');
    }

    this.refreshToken = refreshToken;
    this.clientId = clientId;
    this.agent = agent;
    this.kv = kv;
    this.codecs = codecs;
    this.jwt = jwt;
    this.client = null;
    this.conversations = new Map();

    this.abortController = new AbortController();

    const refreshTokenKey = `twitter:refreshToken`;
    const seenTweetIdsKey = `twitter:seenTweetIds`;

    const _bind = async () => {
      const _ensureClient = async () => {
        // clear old client if neccessary
        if (this.client) {
          // check if the client is still ok
          let ok = true;
          try {
            const user = await _fetchLocalUser();
            if (!user) {
              ok = false;
            }
          } catch (err) {
            console.warn('client no authorized, attempting refresh:', err);
            ok = false;
          }
          if (!ok) {
            this.client = null;
          }
        }
        // refresh client if necessary
        if (!this.client) {
          await _refreshClient();
        }
      };
      const _fetchAccessToken = async () => {
        const _tryFetch = async (refreshToken: string) => {
          const fd = new URLSearchParams();
          fd.append('refresh_token', refreshToken);
          fd.append('grant_type', 'refresh_token'); 
          fd.append('client_id', this.clientId);

          const res = await fetch('https://api.x.com/2/oauth2/token', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: fd,
          });

          if (res.ok) {
            const data = await res.json();
            // console.log('got new access/refresh tokens', data);
            return data;
          } else {
            const text = await res.text();
            throw new Error(`Failed to refresh token: ${res.status}: ${text}`);
          }
        };

        const data = await (async () => {
          let error = null;
          try {
            return await _tryFetch(this.refreshToken);
          } catch (err) {
            error = err;
          }
          try {
            const cachedRefreshToken = await this.kv.get(refreshTokenKey, null);
            if (cachedRefreshToken) {
              return await _tryFetch(cachedRefreshToken);
            } else {
              throw new Error(`Passed refresh token didn't work and no refresh token cached; aborting`);
            }
          } catch (err) {
            error = err;
          }
          throw error;
        })();
        await this.kv.set(refreshTokenKey, data.refresh_token);
        return data.access_token;
      };
      const _refreshClient = async () => {
        const accessToken = await _fetchAccessToken();
        this.client = new TwitterClient(accessToken, {
          endpoint: `https://ai.upstreet.ai/api/twitter`,
        });
      };

      // GET /2/users/me - Get authenticated user
      const _fetchLocalUser = async () => {
        return await this.client.users.findMyUser();
      };
      // GET /2/users/:id/mentions - Get tweets mentioning user 
      const _fetchMentions = async (userId: string) => {
        return await this.client.tweets.usersIdMentions(userId, {
          expansions: ["author_id"],
          "tweet.fields": ["created_at", "conversation_id"]
        });
      };
      // GET /2/users/:id - Get user by ID
      const _fetchUserById = async (userId: string) => {
        return await this.client.users.findUserById(userId);
      };

      const _handleTweet = async (tweet: any, author: any) => {
        const { id: tweetId, text, conversation_id } = tweet;
        const { id: authorId } = author.data;

        // Create or get conversation
        let conversation = this.conversations.get(conversation_id);
        if (!conversation) {
          const agentPlayer = new Player(this.agent.id, {
            name: this.agent.name,
            bio: this.agent.bio,
          });
          
          conversation = new ConversationObject({
            agentPlayer,
            getHash: () => `twitter:conversation:${conversation_id}`,
            messageCache: createMessageCache({
              agent: this.agent,
              conversationId: `twitter:conversation:${conversation_id}`,
              agentId: this.agent.id,
            }),
          });
          
          this.agent.conversationManager.addConversation(conversation);
          this.conversations.set(conversation_id, conversation);

          bindConversationToAgent({
            agent: this.agent,
            conversation,
          });

          // add ourself as a player
          const player = new Player(this.agent.id, {
            name: this.agent.name,
            // previewUrl: this.agent.previewUrl,
          });
          conversation.addAgent(this.agent.id, player);
        }

        // add the author as a player
        const player = makePlayerFromAuthor(author);
        conversation.addAgent(authorId, player);

        // Add message to conversation
        const rawMessage = {
          method: 'say',
          args: {
            text
          }
        };
        const newMessage = formatConversationMessage(rawMessage, {
          agent: this.agent,
        });

        const steps = await conversation.addLocalMessage(newMessage);

        const actions = steps.map(step => step.action).filter(Boolean);
        for (const message of actions) {
          const { method, args } = message;

          console.log('got new twitter message', message, tweet);

          if (method === 'say') {
            const { text } = args;
            // Send the response tweet
            await this.client.tweets.createTweet({
              text,
              reply: {
                in_reply_to_tweet_id: tweetId,
              }
            });
          }
        }
      };

      const queueManager = new QueueManager();
      const _poll = async () => {
        try {
          await queueManager.waitForTurn(async () => {
            await _ensureClient();
            const user = await _fetchLocalUser();
            const mentions = await _fetchMentions(user.data.id);
            const seenTweetIds = await this.kv.get(seenTweetIdsKey, []);
            const mentionsData = (mentions.data || [])
              .filter(tweet => tweet.author_id !== user.data.id) // filter out our own tweets
              .filter(tweet => !seenTweetIds.includes(tweet.id)); // filter out seen tweets

            if (mentionsData.length > 0) {
              const tweetPromises = mentionsData.map(async (tweet) => {
                // tweet:
                // - id: string (Tweet ID)
                // - text: string (Tweet content) 
                // - author_id: string (User ID who wrote the tweet)
                // - created_at: string (Tweet creation timestamp)
                // - edit_history_tweet_ids: string[] (IDs of previous versions if edited)
                // - in_reply_to_user_id: string | null (User ID tweet is replying to)
                // - referenced_tweets: Array (Contains info about tweets this tweet references)
                // - conversation_id: string (Thread ID this tweet belongs to)
                // - lang: string (Language code of tweet content)
                // - possibly_sensitive: boolean (If tweet may contain sensitive content)
                // - reply_settings: string (Who can reply to this tweet)
                // - source: string (Client used to post tweet)
                const { author_id } = tweet;
                const author = await _fetchUserById(author_id);
                // author:
                // - id: string (User ID)
                // - name: string (User's display name)
                // - username: string (User's Twitter handle)
                await _handleTweet(tweet, author);
              });
              await Promise.all(tweetPromises);
            } else {
              console.warn('no new tweets')
            }
          });
        } catch (err) {
          console.error('Error polling tweets:', err);
        }
      };

      // Poll for tweets mentioning us
      const pollTimeout = setTimeout(() => {
        _poll();
      });
      const pollRate = 15 * 60 * 1000 / 10 + 1000; // 10 requests per 15 minutes, plus 1 second buffer
      const pollInterval = setInterval(async () => {
        _poll();
      }, pollRate);

      // listen for abort signal
      const { signal } = this.abortController;
      signal.addEventListener('abort', () => {
        clearTimeout(pollTimeout);
        clearInterval(pollInterval);

        // remove all conversations
        for (const conversation of this.conversations.values()) {
          this.agent.conversationManager.removeConversation(conversation);
        }
      });
    };
    
    (async () => {
      await _bind();
    })().catch(err => {
      console.warn('twitter bot error', err);
    });
  }

  destroy() {
    this.abortController.abort();
    this.abortController = new AbortController();
  }
}
export class TwitterManager extends EventTarget {
  codecs: any;
  constructor({
    codecs,
  }) {
    super();

    this.codecs = codecs;
  }
  async addTwitterBot(args: TwitterArgs) {
    const twitterBot = new TwitterBot(args);
    return twitterBot;
  }
  removeTwitterBot(twitterBot: TwitterBot) {
    twitterBot.destroy();
  }
  live() {
    // nothing
  }
  destroy() {
    // nothing
  }
}