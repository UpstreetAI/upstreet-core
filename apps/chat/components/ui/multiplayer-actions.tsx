'use client'

import * as React from 'react'
import { useRouter } from 'next/navigation'
// import dedent from 'dedent'
// import { NetworkRealms } from '@upstreet/multiplayer/public/network-realms.mjs';
// import { multiplayerEndpointUrl } from '@/utils/const/endpoints';
import { getAgentEndpointUrl, getAgentHost } from '@/lib/utils'
import { r2EndpointUrl } from '@/utils/const/endpoints';
import { getJWT } from '@/lib/jwt';
import { AudioContextOutputStream } from '@/lib/audio/audio-context-output';
import { ReactAgentsMultiplayerConnection } from 'react-agents-client/react-agents-client.mjs';
import { PlayersMap, TypingMap } from 'react-agents-client/util/maps.mjs';
import type {
  ActionMessage,
  Attachment,
  PlayableAudioStream,
  PlayableVideoStream,
} from 'react-agents/types';
import { useLoading } from '@/lib/client/hooks/use-loading';
import { AudioDecodeStream } from 'codecs/audio-decode.mjs';
import * as codecs from 'codecs/ws-codec-runtime-worker.mjs';
import { QueueManager } from 'queue-manager';
import { createHash } from 'crypto';

//

const join = async ({
  room,
  guid,
}: {
  room: string;
  guid: string;
}) => {
  // cause the agent to join the room
  const agentHost = getAgentHost(guid);
  const u = `${agentHost}/join`;
  // console.log('join 1', u);
  const headers = {};
  const jwt = localStorage.getItem('jwt');
  (headers as any).Authorization = `Bearer ${jwt}`;
  const joinReq = await fetch(u, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      room,
    }),
  });
  if (joinReq.ok) {
    const joinJson = await joinReq.json();
    // console.log('join 2', joinJson);
  } else {
    const text = await joinReq.text();
    console.warn(
      'failed to join, status code: ' + joinReq.status + ': ' + text,
    );
  }
};

const uploadFile = async (file: File) => {
  const jwt = await getJWT();
  const id = crypto.randomUUID();
  const keyPath = ['uploads', id, file.name].join('/');
  const u = `${r2EndpointUrl}/${keyPath}`;
  const res = await fetch(u, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
    body: file,
  });
  if (res.ok) {
    const url = await res.json();
    return url;
  } else {
    const text = await res.text();
    throw new Error(`could not upload file: ${file.name}: ${text}`);
  }
}

//

interface MultiplayerActionsContextType {
  connected: boolean
  room: string
  getCrdtDoc: () => any
  localPlayerSpec: PlayerSpec
  playersMap: PlayersMap
  typingMap: TypingMap
  playersCache: Map<string, Player>
  messages: object[]
  setMultiplayerConnectionParameters: (params: object | null) => void
  // sendMessage: (method: string, args: object, attachments?: Attachment[], opts?: MessageSendOptions) => void
  sendChatMessage: (text: string) => void
  sendMediaMessage: (file: File) => Promise<void>
  sendNudgeMessage: (guid: string) => void
  agentJoin: (guid: string) => Promise<void>
  agentJoinRoom: (guid: string, room: string) => Promise<void>
  agentGetEmbedRoom: (guid: string) => Promise<String>
  agentLeave: (guid: string, room: string) => Promise<void>
  addAudioSource: (stream: PlayableAudioStream) => {
    waitForFinish: () => Promise<void>
  }
  removeAudioSource: (stream: PlayableAudioStream) => void
  addVideoSource: (stream: PlayableVideoStream) => {
    waitForFinish: () => Promise<void>
  }
  removeVideoSource: (stream: PlayableVideoStream) => void
  epoch: number
}
type MessageSendOptions = {
  hidden?: boolean;
  human?: boolean;
};

const MultiplayerActionsContext = React.createContext<MultiplayerActionsContextType | undefined>(
  undefined
);

export function useMultiplayerActions() {
  const context = React.useContext(MultiplayerActionsContext)
  if (!context) {
    throw new Error('useMultiplayerActions must be used within a MultiplayerActionsProvider')
  }
  return context
}

interface MultiplayerActionsProviderProps {
  children: React.ReactNode
}

export type PlayerSpec = {
  id: string;
  name: string;
  previewUrl: string;
  capabilities: string[];
};

export class Player {
  playerId: string;
  playerSpec: PlayerSpec;
  constructor(playerId = '', playerSpec: PlayerSpec) {
    this.playerId = playerId;
    this.playerSpec = playerSpec;
  }
  getPlayerSpec() {
    return this.playerSpec;
  }
  setPlayerSpec(playerSpec: PlayerSpec) {
    this.playerSpec = playerSpec;
  }
}

const makeFakePlayerSpec = () => (
  {
    id: '',
    name: '',
    previewUrl: '',
    capabilities: [],
  }
);
export function MultiplayerActionsProvider({ children }: MultiplayerActionsProviderProps) {
  const router = useRouter();
  const { setIsAgentLoading } = useLoading();
  const [epoch, setEpoch] = React.useState(0);
  const [multiplayerState, setMultiplayerState] = React.useState(() => {
    let connected = false;
    let room = '';
    let multiplayerConnection: any | null = null;
    let localPlayerSpec: PlayerSpec = makeFakePlayerSpec();
    let playersMap = new PlayersMap();
    let playersCache: Map<string, Player> = new Map();
    let typingMap = new TypingMap();
    let messages: object[] = [];

    const refresh = () => {
      setEpoch((prev) => prev + 1);
    };

    const sendMessage = (method: string, args: object = {}, attachments?: Attachment[], opts?: MessageSendOptions) => {
      if (multiplayerConnection) {
        const { id: userId, name } = localPlayerSpec;

        const timestamp = new Date();
        const message: ActionMessage = {
          id: crypto.randomUUID(),
          method,
          userId,
          name,
          args,
          attachments,
          human: typeof opts?.human === 'boolean' ? opts.human : true,
          hidden: !!opts?.hidden,
          timestamp,
        };
        // console.log('send chat message', message);
        multiplayerConnection.sendChatMessage(message);
      } else {
        console.warn(`can't send message: not connected`);
      }
    };

    const multiplayerState = {
      getConnected: () => connected,
      getRoom: () => room,
      getCrdtDoc: () => {
        // console.log('got realms 1', realms);
        const realms = multiplayerConnection?.realms;
        if (realms) {
          const headRealm = realms.getClosestRealm(realms.lastRootRealmKey);
          // console.log('got realms 2', headRealm, headRealm);
          if (headRealm) {
            return headRealm.networkedCrdtClient.getDoc();
          } else {
            return null;
          }
        } else {
          return null;
        }
      },
      getLocalPlayerSpec: () => localPlayerSpec,
      getPlayersMap: () => playersMap,
      getPlayersCache: () => playersCache,
      getTypingMap: () => typingMap,
      getMessages: () => messages,
      setMultiplayerConnectionParameters: (opts: object | null) => {
        let newRoom: string = (opts as any)?.room || '';
        let newLocalPlayerSpec: PlayerSpec = (opts as any)?.localPlayerSpec || makeFakePlayerSpec();

        if (room !== newRoom) {
          // latch new state
          room = newRoom;
          localPlayerSpec = newLocalPlayerSpec;
          messages = [];

          // disconnect old room
          if (multiplayerConnection) {
            multiplayerConnection.disconnect();
            multiplayerConnection = null;
          }

          // connect new room
          if (room) {
            if (!newLocalPlayerSpec?.id || !newLocalPlayerSpec?.name || !newLocalPlayerSpec?.previewUrl) {
              throw new Error('Invalid local player spec: ' + JSON.stringify(newLocalPlayerSpec, null, 2));
            }

            const profile = {
              ...newLocalPlayerSpec,
              capabilities: [
                'human',
              ],
            };
            const debug = true;
            multiplayerConnection = new ReactAgentsMultiplayerConnection({
              room,
              profile,
            });
            const localLogLevel = debug ? ReactAgentsMultiplayerConnection.logLevels.debug : ReactAgentsMultiplayerConnection.logLevels.info;
            multiplayerConnection.addEventListener('log', (e: any) => {
              const { args, logLevel } = e.data;
              if (localLogLevel >= logLevel) {
                console.log(...args);
              }
            });
            multiplayerConnection.addEventListener('chat', (e: any) => {
              const { message } = e.data;
              // console.log('got message', { message });
              const { userId: messageUserId, name, method, args } = message;

              switch (method) {
                case 'say': {
                  // const { text } = args;
                  // if (messageUserId !== userId) {
                  //   console.log(`${name}: ${text}`);
                  // }
                  break;
                }
                case 'log': {
                  // if (debug) {
                  // console.log('got log message', JSON.stringify(args, null, 2));
                  // const { userId, name, text } = args;
                  // console.log(`\r${name}: ${text}`);
                  // replServer.displayPrompt(true);
                  const { text } = args;
                  console.log(text);
                  // console.log(eraseLine + JSON.stringify(args2, null, 2));
                  // }
                  break;
                }
                case 'typing': {
                  const { typing } = args;
                  typingMap.set(messageUserId, { userId: messageUserId, name, typing });
                  break;
                }
                case 'join':
                case 'leave':
                case 'nudge':
                  {
                    // nothing
                    break;
                  }
                case 'mediaPerception':
                case 'browserAction':
                case 'paymentRequest':
                  {
                    // nothing
                    break;
                  }
                default: {
                  // if (debug) {
                  // console.log('got log message', JSON.stringify(args, null, 2));
                  // const { userId, name, text } = args;
                  // console.log(`\r${name}: ${text}`);
                  // replServer.displayPrompt(true);
                  console.log('unhandled method', JSON.stringify(message));
                  // console.log(eraseLine + JSON.stringify(args2, null, 2));
                  // }
                  break;
                }
              }
            });
            // const { virtualPlayers } = multiplayerConnection;
            (async () => {
              console.log('multiplayer connecting...');
              await multiplayerConnection.waitForConnect();
              console.log('multiplayer connected');
            })();
            multiplayerConnection.addEventListener('connect', (e: any) => {
              connected = true;
              refresh();
            });
            multiplayerConnection.addEventListener('disconnect', (e: any) => {
              connected = false;
              refresh();
            });
            multiplayerConnection.addEventListener('chat', (e: any) => {
              const { message } = e.data;
              messages = [...messages, message];
              refresh();
            });

            playersMap = multiplayerConnection.playersMap;
            typingMap = multiplayerConnection.typingMap;


            // join event when the playerSpec is updated and the player is not already in the playersMap
            // this is to be listened to for the case where the playerSpec is set after the player is connected
            multiplayerConnection.addEventListener('playerSpecUpdate', (e: any) => {
              const { player } = e.data;
              const profile = player.getPlayerSpec();
              const { id: userId, name } = profile;
              if (!playersMap.has(userId)) {
                // add the player to the playersMap when the playerSpec is updated and the player is not already in the playersMap
                playersMap.add(userId, player);
                const joinMessage = {
                  method: 'join',
                  userId,
                  name,
                  args: {},
                  timestamp: Date.now(),
                };
                messages = [...messages, joinMessage];
              }
              refresh();
            });
            // join + leave messages
            multiplayerConnection.addEventListener('join', (e: any) => {
              const { player } = e.data;
              const profile = player.getPlayerSpec();
              const { id: userId, name } = profile;
              const joinMessage = {
                method: 'join',
                userId,
                name,
                args: {},
                timestamp: Date.now(),
              };
              messages = [...messages, joinMessage];

              refresh();
            });
            multiplayerConnection.addEventListener('leave', (e: any) => {
              const { player } = e.data;
              const profile = player.getPlayerSpec();
              const { id: userId, name } = profile;
              const leaveMessage = {
                method: 'leave',
                userId,
                name,
                args: {},
                timestamp: Date.now(),
              };
              messages = [...messages, leaveMessage];

              refresh();
            });

            // typing
            typingMap.addEventListener('typingchange', (e) => {
              refresh();
            });

            const _trackPlayersCache = () => {
              const updatePlayersCache = () => {
                (globalThis as any).playersMap = playersMap;
                (globalThis as any).playersCache = playersCache;

                // ensure all players are in the players cache
                for (const [playerId, player] of playersMap.getMap()) {
                  playersCache.set(playerId, player);
                }

                refresh();
              };
              updatePlayersCache();

              ['join', 'leave'].forEach((eventName) => {
                multiplayerConnection.addEventListener(eventName, updatePlayersCache);
              });
            };
            _trackPlayersCache();

            const _trackAudio = () => {
              const audioStreams = new Map();
              const audioQueueManger = new QueueManager();
              multiplayerConnection.addEventListener('audiostart', (e: any) => {
                const {
                  playerId,
                  streamId,
                  type,
                  disposition,
                } = e.data;

                if (disposition === 'audio') {
                  const outputStream = new AudioContextOutputStream();
                  const { sampleRate } = outputStream;

                  // decode stream
                  const decodeStream = new AudioDecodeStream({
                    type,
                    sampleRate,
                    format: 'f32',
                    codecs,
                  }) as any;

                  const writer = decodeStream.writable.getWriter();
                  writer.metadata = {
                    playerId,
                  };
                  audioStreams.set(streamId, writer);

                  (async () => {
                    await audioQueueManger.waitForTurn(async ({
                      signal,
                    }: {
                      signal: AbortSignal,
                    }) => {
                      signal.addEventListener('abort', (e: any) => {
                        decodeStream.abort(e.reason);
                        outputStream.abort(e.reason);
                      });

                      await decodeStream.readable.pipeTo(outputStream);
                    });
                  })().catch((e) => {
                    console.error('error in audio pipeline', e);
                  });
                }
              });
              multiplayerConnection.addEventListener('audio', (e: any) => {
                const {
                  playerId,
                  streamId,
                  data,
                } = e.data;

                const stream = audioStreams.get(streamId);
                if (stream) {
                  stream.write(data);
                } else {
                  // throw away unmapped data
                  // console.warn('dropping audio data', e.data);
                }
              });
              multiplayerConnection.addEventListener('audioend', (e: any) => {
                const {
                  playerId,
                  streamId,
                  data,
                } = e.data;

                const stream = audioStreams.get(streamId);
                if (stream) {
                  stream.close();
                  audioStreams.delete(streamId);
                } else {
                  // throw away unmapped data
                  console.warn('dropping audioend data', e.data);
                }
              });
            };
            _trackAudio();
          }

          refresh();
        }
      },
      sendChatMessage: (text: string) =>
        sendMessage('say', {
          text,
        }),
      sendMediaMessage: async (file: File) => {
        const url = await uploadFile(file);
        const id = crypto.randomUUID();
        sendMessage('say', undefined, [
          {
            id,
            type: file.type,
            url,
          },
        ]);
      },
      sendNudgeMessage: (guid: string) => {
        sendMessage('nudge', {
          targetUserId: guid,
        }, undefined, {
          hidden: true,
        });
      },
      agentJoin: async (guid: string) => {
        const oldRoom = multiplayerState.getRoom();
        const room = oldRoom || crypto.randomUUID();
        console.log('agent join', {
          guid,
          room,
        });

        // Set loading state to true
        setIsAgentLoading(true);

        // redirect to the room first
        if (!/\/rooms\//.test(location.pathname)) {
          router.push(`/rooms/${room}`);
        }
        // wait for the router to complete the navigation
        await new Promise(resolve => setTimeout(resolve, 1000));
        await join({
          room,
          guid,
        });

        // Set loading state to false
        setIsAgentLoading(false);
      },
      agentGetEmbedRoom: async (guid: string) => {
        const response = await fetch('https://api.ipify.org?format=json');
          const data = await response.json();
          const ipAddress = data.ip;

          // Url ancestor origin ( for setting a unique room id )
          const websiteUrl = window.location.ancestorOrigins[0];
          
          // Concatenate IP address and website URL, and guid (agent id) 
          // to form a unique "room" key for the embed
          const roomKey = `${ipAddress}${websiteUrl}${guid}`;

          const hash = createHash('sha256');
          hash.update(roomKey);
          const roomKeyUID = `embed:${hash.digest('hex')}`;
          // console.log('roomKeyUID', roomKeyUID);
          let room = localStorage.getItem('embed_room_id');

          if (!room) {
            // If not, store the new roomKeyUID in localstorage
            localStorage.setItem('embed_room_id', roomKeyUID);
            room = roomKeyUID;
          }

          // console.log('local storage room: ', room);
        
          return room;
      },
      agentJoinRoom: async (guid: string, room: string) => {
        console.log('agent join room', {
          room,
          guid,
        });

        // Set loading state to true
        setIsAgentLoading(true);

        await new Promise(resolve => setTimeout(resolve, 1000));
        await join({
          room,
          guid,
        });

        console.log('agent join room done');
        
        // Set loading state to false
        setIsAgentLoading(false);
      },
      agentLeave: async (guid: string, room: string) => {
        console.log('agent leave', {
          guid,
          room,
        });
        const agentEndpointUrl = getAgentEndpointUrl(guid);
        const leaveUrl = `${agentEndpointUrl}leave`;
        console.log('click x', leaveUrl);
        const res = await fetch(leaveUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room,
          }),
        });
        if (res.ok) {
          const blob = await res.blob();
        }
      },
      addAudioSource: (stream: PlayableAudioStream) => {
        if (multiplayerConnection) {
          return multiplayerConnection.addAudioSource(stream) as {
            waitForFinish: () => Promise<void>
          };
        } else {
          throw new Error('realms not connected');
        }
      },
      removeAudioSource: (stream: PlayableAudioStream) => {
        if (multiplayerConnection) {
          multiplayerConnection.removeAudioSource(stream);
        } else {
          throw new Error('realms not connected');
        }
      },
      addVideoSource: (stream: PlayableVideoStream) => {
        if (multiplayerConnection) {
          return multiplayerConnection.addVideoSource(stream) as {
            waitForFinish: () => Promise<void>
          };
        } else {
          throw new Error('realms not connected');
        }
      },
      removeVideoSource: (stream: PlayableVideoStream) => {
        if (multiplayerConnection) {
          multiplayerConnection.removeVideoSource(stream);
        } else {
          throw new Error('realms not connected');
        }
      },
      typingMap,
    };
    return multiplayerState;
  });
  const connected = multiplayerState.getConnected();
  const room = multiplayerState.getRoom();
  const getCrdtDoc = multiplayerState.getCrdtDoc;
  const localPlayerSpec = multiplayerState.getLocalPlayerSpec();
  const playersMap = multiplayerState.getPlayersMap();
  const playersCache = multiplayerState.getPlayersCache();
  const messages = multiplayerState.getMessages();
  const typingMap = multiplayerState.getTypingMap();
  const setMultiplayerConnectionParameters = multiplayerState.setMultiplayerConnectionParameters;
  // const sendMessage = multiplayerState.sendMessage;
  const sendChatMessage = multiplayerState.sendChatMessage;
  const sendMediaMessage = multiplayerState.sendMediaMessage;
  const sendNudgeMessage = multiplayerState.sendNudgeMessage;
  const agentJoin = multiplayerState.agentJoin;
  const agentJoinRoom = multiplayerState.agentJoinRoom;
  const agentGetEmbedRoom = multiplayerState.agentGetEmbedRoom;
  const agentLeave = multiplayerState.agentLeave;
  const addAudioSource = multiplayerState.addAudioSource;
  const removeAudioSource = multiplayerState.removeAudioSource;
  const addVideoSource = multiplayerState.addVideoSource;
  const removeVideoSource = multiplayerState.removeVideoSource;

  return (
    <MultiplayerActionsContext.Provider
      value={{
        connected,
        room,
        getCrdtDoc,
        localPlayerSpec,
        playersMap,
        playersCache,
        messages,
        setMultiplayerConnectionParameters,
        // sendMessage,
        sendChatMessage,
        sendMediaMessage,
        sendNudgeMessage,
        agentJoin,
        agentJoinRoom,
        agentGetEmbedRoom,
        agentLeave,
        addAudioSource,
        removeAudioSource,
        addVideoSource,
        removeVideoSource,
        typingMap,
        epoch,
      }}
    >
      {children}
    </MultiplayerActionsContext.Provider>
  )
}
