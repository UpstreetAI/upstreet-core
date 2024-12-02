import type { ActiveAgentObject } from './types';
import { headers } from './constants.mjs';
import { makeAnonymousClient } from './util/supabase-client.mjs';
import { AgentRenderer } from './classes/agent-renderer.tsx';
import { ChatsSpecification } from './classes/chats-specification.ts';
import { pingRate } from './classes/ping-manager.ts';
import { serverHandler } from './routes/server.ts';
import { multiplayerEndpointUrl } from './util/endpoints.mjs';

//

const cachedGet = (fn: () => any) => {
  let value = null;
  let ran = false;
  return function() {
    if (!ran) {
      value = fn.call(this);
      ran = true;
    }
    return value;
  };
};

export class AgentMain extends EventTarget {
  state: any;
  env: any;
  auth: any;
  supabase: any;
  chatsSpecification: ChatsSpecification;
  agentRenderer: AgentRenderer;
  loadPromise: Promise<void>;

  constructor(state: any, env: any, auth: any) {
    super();

    this.state = state;
    this.env = env;
    this.auth = auth;
    this.supabase = makeAnonymousClient(auth.AGENT_TOKEN);

    this.chatsSpecification = new ChatsSpecification({
      userId: this.#getId(),
      supabase: this.supabase,
    });
    const {
      userRender,
      codecs,
    } = state;
    const {
      init,
      debug,
    } = env;
    this.agentRenderer = new AgentRenderer({
      env,
      auth,
      userRender,
      codecs,
      init,
      chatsSpecification: this.chatsSpecification,
    });
    const bindAlarm = () => {
      const updatealarm = () => {
        this.updateAlarm();
      };
      this.agentRenderer.registry.addEventListener('updatealarm', updatealarm);
    };
    bindAlarm();

    this.loadPromise = this.agentRenderer.waitForRender();

    // initial alarm
    (async () => {
      await this.alarm();
    })();
  }

  waitForLoad() {
    return this.loadPromise;
  }

  //

  #getId = cachedGet(function() {
    return this.#getAgentJson().id;
  })
  #getOwnerId = cachedGet(function() {
    return this.#getAgentJson().ownerId;
  })
  #getAgentJson = cachedGet(function() {
    const agentJsonString = this.env.AGENT_JSON;
    const agentJson = JSON.parse(agentJsonString);
    return agentJson;
  })

  //

  // Handle HTTP requests from clients.
  async fetch(request: Request) {
    try {
      const u = new URL(request.url);
      // console.log('worker request', request.method, u.href);

      await this.waitForLoad();

      // parse the url
      let match;
      if ((match = u.pathname.match(/^\/([^/]*)/))) {
        const subpath = match[1];
        const guid = this.#getId();

        /* const handleAgentJson = async () => {
          const agentJson = this.#getAgentJson();
          const s = JSON.stringify(agentJson);
          return new Response(s, {
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
          });
        }; */
        /* const handleWs = async () => {
          // Expect to receive a WebSocket Upgrade request.
          // If there is one, accept the request and return a WebSocket Response.
          const upgradeHeader = request.headers.get('Upgrade');
          if (upgradeHeader === 'websocket') {
            console.log('got websocket open', {
              guid,
            });

            // Creates two ends of a WebSocket connection.
            const webSocketPair = new globalThis.WebSocketPair();
            const [client, server] = Object.values(webSocketPair) as [any, any];

            // Calling `accept()` informs the runtime that this WebSocket is to begin terminating
            // request within the Durable Object. It has the effect of "accepting" the connection,
            // and allowing the WebSocket to send and receive messages.
            server.accept();

            // input from the websocket
            server.addEventListener('message', async (event) => {
              const j = JSON.parse(event.data);
              const { method, args } = j;
              switch (method) {
                case 'join': {
                  const {
                    room,
                    endpointUrl = multiplayerEndpointUrl,
                    only = false,
                  } = args;
                  if (only) {
                    await this.chatsSpecification.leaveAll();
                  }
                  await this.chatsSpecification.join({
                    room,
                    endpointUrl,
                  });
                  break;
                }
                case 'leave': {
                  const {
                    room,
                    endpointUrl = multiplayerEndpointUrl,
                  } = args;
                  await this.chatsSpecification.leave({
                    room,
                    endpointUrl,
                  });
                  break;
                }
                // case 'leaveAll': {
                //   await this.chatsSpecification.leaveAll();
                //   break;
                // }
              }
            });

            // // output to the websocket
            // const onmessage = (e) => {
            //   // skip recursive chat messages coming from the socket
            //   server.send(JSON.stringify(e.data));
            // };
            // this.conversationContext.addEventListener('message', onmessage);
            server.addEventListener('close', (e) => {
              console.log('got websocket close', {
                guid,
              });

              // this.conversationContext.removeEventListener(
              //   'message',
              //   onmessage,
              // );

              server.close(1001, 'Durable Object is closing WebSocket');
            });

            return new Response(null, {
              status: 101,
              headers,
              webSocket: client,
            });
          } else {
            // expected upgrade header. respond with upgrade required status code.
            return new Response('durable object: upgrade required', {
              status: 426,
              headers,
            });
          }
        }; */
        /* const handleEvents = async () => {
          throw new Error('not implemented');

          // output to the event stream
          const message = (e) => {
            const s = JSON.stringify(e.data);
            const b = textEncoder.encode(`data: ${s}\n\n`);
            controller.enqueue(b);
          };
          this.conversationContext.addEventListener('message', message);
          this.addEventListener('error', message);
          const cleanup = () => {
            this.conversationContext.removeEventListener('message', message);
            this.removeEventListener('error', message);
          };

          // response stream
          let controller = null;
          const readable = new ReadableStream({
            start(_controller) {
              controller = _controller;

              const j = {
                ok: true,
              };
              const s = JSON.stringify(j);
              const b = textEncoder.encode(`data: ${s}\n\n`);
              controller.enqueue(b);
            },
            cancel() {
              cleanup();
            },
          });

          const res = new Response(readable, {
            headers: {
              ...headers,
              'Content-Type': 'text/event-stream',
            },
          });
          return res;
        }; */
        /* const handleStatus = async () => {
          const registry = this.agentRenderer.registry;

          const agents = registry.agents.map((agent) => {
            const {
              name,
              description,
              bio,
            } = agent;

            const agentRealms = Array.from(agent.rooms.values());
            const rooms = agentRealms.map((realms) => {
              const { conversation } = realms.metadata;
              const { room, endpointUrl } = conversation;
              return {
                room,
                endpointUrl,
              };
            });

            return {
              name,
              description,
              bio,
              rooms,
            };
          });

          return new Response(JSON.stringify({
            agents,
          }), {
            headers: {
              ...headers,
              'Content-Type': 'application/json',
            },
          });
        }; */
        /* const handleWebhook = async () => {
          if (request.method === 'POST') {
            const jsonPromise = request.json();

            const authorizationHeader = request.headers['authorization'];
            const bearerMatch = authorizationHeader?.match(/^Bearer ([\s\S]+)$/i);
            const jwt = bearerMatch?.[1];
            const userId = jwt && await getUserIdForJwt(jwt);
            const ownerId = this.#getOwnerId();

            if (userId === ownerId) {
              const json = await jsonPromise;

              console.log('got webhook payload', json);

              return new Response(JSON.stringify({
                userId,
                json,
              }), {
                headers,
              });
            } else {
              console.log('unauthorized webhook', {
                userId,
                ownerId,
              });

              return new Response(JSON.stringify({
                error: 'unauthorized',
              }), {
                status: 401,
                headers,
              });
            }
          } else {
            return new Response(JSON.stringify({
              error: 'method not allowed',
            }), {
              status: 405,
              headers,
            });
          }
        }; */
        const handleJoin = async () => {
          // read the body json
          const body = await request.json();
          const {
            room,
            endpointUrl = multiplayerEndpointUrl,
            only = false,
          } = body ?? {};
          if (typeof room === 'string') {
            // if (only) {
            //   await this.chatsSpecification.leaveAll();
            // }

            await this.chatsSpecification.join({
              room,
              endpointUrl,
            });

            return new Response(JSON.stringify({ ok: true }), {
              headers,
            });
          } else {
            return new Response(JSON.stringify({
              error: 'invalid request',
            }), {
              status: 400,
              headers,
            });
          }
        };
        const handleLeave = async () => {
          const body = await request.json();
          const {
            room,
            endpointUrl = multiplayerEndpointUrl,
          } = body ?? {};
          if (typeof room === 'string') {
            await this.chatsSpecification.leave({
              room,
              endpointUrl,
            });

            return new Response(JSON.stringify({ ok: true }), {
              headers,
            });
          } else {
            return new Response(JSON.stringify({
              error: 'invalid request',
            }), {
              status: 400,
              headers,
            });
          }
        };
        const handleDefaultRequest = async () => {
          const serverResponse = await serverHandler(request, {
            agentRenderer: this.agentRenderer,
            env: this.env,
          });
          return serverResponse;
        };

        switch (subpath) {
          // case 'agent.json':
          //   return await handleAgentJson();
          // case 'status':
          //   return await handleStatus();
          // case 'ws':
          //   return await handleWs();
          // case 'events':
          //   return await handleEvents();
          // case 'webhook':
          //   return await handleWebhook();
          case 'join':
            return await handleJoin();
          case 'leave':
            return await handleLeave();
          default:
            return await handleDefaultRequest();
        }
      } else {
        return new Response('durable object: path not found', {
          headers,
          status: 404,
        });
      }
    } catch (err) {
      console.warn(err);

      return new Response(JSON.stringify({ error: err.stack }), {
        headers,
        status: 500,
      });
    }
  }
  async updateAlarm() {
    // get the next timeout
    const agents = this.agentRenderer.registry.agents as ActiveAgentObject[];
    const timeouts = agents.map((agent) =>
      agent.liveManager.getNextTimeout()
    );
    {
      const now = Date.now();
      const pingTimeout = now + pingRate;
      timeouts.push(pingTimeout);
    }
    {
      const oldAlarm = await this.state.storage.getAlarm();
      if (oldAlarm !== null) {
        timeouts.push(oldAlarm);
      }
    }
    const minTimeout = Math.min(...timeouts);

    // set the next alarm
    this.state.storage.setAlarm(minTimeout);
  }
  async alarm() {
    // wait for load just in case
    await this.waitForLoad();

    // process the agent's live managers
    const agents = this.agentRenderer.registry.agents as ActiveAgentObject[];
    const processPromises = agents.map(async (agent) => {
      agent.liveManager.process();
    });
    await Promise.all(processPromises);

    this.updateAlarm();
  }
}
