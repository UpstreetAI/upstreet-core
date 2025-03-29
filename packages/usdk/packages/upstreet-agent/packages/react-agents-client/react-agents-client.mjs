import {
  multiplayerEndpointUrl,
} from 'react-agents/util/endpoints.mjs';
import * as agentMultiplayer from 'agent-multiplayer';
import { METHODS, METHOD_NAMES } from 'agent-multiplayer';
// import type { AgentMultiplayerApi } from 'agent-multiplayer';
import {
  Player,
} from './util/player.mjs';
import {
  PlayersMap,
  TypingMap,
  SpeakerMap,
} from './util/maps.mjs';

// XXX handle joins
/* export class ReactAgentsClient {
  url;
  constructor(url) {
    this.url = url;
  }
  async join(room, {
    only = false,
  } = {}) {
    const numRetries = 3;
    for (let i = 0; i < numRetries; i++) {
      const u = `${this.url}/join`;
      try {
        const opts = {
          room,
          only,
        };
        // console.log('join opts', opts);
        const joinReq = await fetch(u, {
          method: 'POST',
          body: JSON.stringify(opts),
        });
        if (joinReq.ok) {
          const joinJson = await joinReq.json();
          // console.log('join json', joinJson);
          return;
        } else if (joinReq.status === 503) { // service unavailable
          continue;
        } else if (joinReq.status === 404) { // not found
          throw new Error('agent not found');
        } else {
          const text = await joinReq.text();
          throw new Error(
            'failed to join, status code: ' + joinReq.status + ': ' + text,
          );
        }
      } catch (err) {
        console.warn('join fetch failed', err);
        await new Promise((accept, reject) => {
          setTimeout(accept, 10000000);
        });
        throw err;
      }
    }
  }
} */

const waitForMessageType = (agentMultiplayerApi, method) => {
  const methodName = METHOD_NAMES[method];
  if (!methodName) {
    throw new Error(`Unknown method: ${method}`);
  }

  return new Promise((resolve, reject) => {
    const onmethod = (o) => {
      resolve(o);
      webSocket.removeEventListener(methodName, onmethod);
      webSocket.removeEventListener('close', onclose);
      webSocket.removeEventListener('error', onerror);
    };
    agentMultiplayerApi.addEventListener(methodName, onmethod);

    const onclose = () => {
      reject(new Error('AgentMultiplayerApi closed'));
    };
    agentMultiplayerApi.addEventListener('close', onclose);

    const onerror = (e) => {
      reject(e);
    };
    agentMultiplayerApi.addEventListener('error', onerror);
  });
};

// type ReactAgentsMultiplayerConnectionApi = {
//   playersMap: PlayersMap;
//   typingMap: TypingMap;
//   speakerMap: SpeakerMap;
//   log: (...args: any[]) => void;
// };

class ReactAgentsMultiplayerConnection {
  static async connect({
    agentMultiplayerConnection,
    profile,
    signal,
  }) {
    // 1. set the player data
    // 2. wait for network init message
    // 3. bind listeners

    agentMultiplayerConnection.send({
      method: METHODS.SET_PLAYER_DATA,
      args: {
        playerData: profile,
      },
    });

    const networkInitMessage = await waitForMessageType(agentMultiplayerConnection, METHODS.NETWORK_INIT);
    if (signal?.aborted) {
      throw new Error('Connection aborted');
    }
    const {
      playerId,
      players,
    } = networkInitMessage.args;

    // set up result
    const result = new EventTarget();
    // members
    result.playerId = playerId;
    const playersMap = new PlayersMap();
    result.playersMap = playersMap;
    const typingMap = new TypingMap();
    result.typingMap = typingMap;
    const speakerMap = new SpeakerMap();
    result.speakerMap = speakerMap;
    // methods
    result.log = (...args) => {
      agentMultiplayerConnection.send({
        method: METHODS.LOG,
        args: {
          playerId,
          args,
        },
      });
    };
    result.sendChatMessage = (message, attachments) => {
      agentMultiplayerConnection.send({
        method: METHODS.CHAT,
        args: {
          playerId,
          message,
          attachments,
        },
      });
    };
    result.setTyping = (typing) => {
      agentMultiplayerConnection.send({
        method: METHODS.TYPING,
        args: {
          playerId,
          typing,
        },
      });
    };
    result.setSpeaking = (speaking) => {
      agentMultiplayerConnection.send({
        method: METHODS.SPEAKING,
        args: {
          playerId,
          speaking,
        },
      });
    };

    // initialize local player
    const localPlayer = new Player(playerId, profile);
    playersMap.add(playerId, localPlayer);

    // initialize remote players
    for (const player of players) {
      const {
        playerId,
        playerData,
      } = player;
      const remotePlayer = new Player(playerId, playerData);
      playersMap.add(playerId, remotePlayer);
    }

    // bind listeners
    [
      [METHODS.CHAT, 'chat'],
      [METHODS.LOG, 'log'],
      [METHODS.AUDIO, 'audio'],
      [METHODS.AUDIOSTART, 'audiostart'],
      [METHODS.AUDIOEND, 'audioend'],
      [METHODS.VIDEO, 'video'],
      [METHODS.VIDEOSTART, 'videostart'],
      [METHODS.VIDEOEND, 'videoend'],
    ].forEach(([method, eventName]) => {
      const methodName = METHOD_NAMES[method];
      if (!methodName) {
        throw new Error(`Unknown method: ${method}`);
      }
      agentMultiplayerConnection.addEventListener(methodName, e => {
        result.dispatchEvent(new MessageEvent(eventName, {
          data: e.data,
        }));
      });
    });
    agentMultiplayerConnection.addEventListener(METHOD_NAMES[METHODS.JOIN], e => {
      const {
        playerId,
        playerData,
      } = e.data;
      let remotePlayer = playersMap.get(playerId);
      if (!remotePlayer) {
        remotePlayer = new Player(playerId, playerData);
        playersMap.add(playerId, remotePlayer);

        result.dispatchEvent(new MessageEvent('join', {
          data: {
            player: remotePlayer,
          },
        }));
      } else {
        result.log('remote player already in playersMap', playerId);
        throw new Error('remote player already in playersMap: ' + playerId);
      }
    });
    agentMultiplayerConnection.addEventListener(METHOD_NAMES[METHODS.LEAVE], e => {
      const {
        playerId,
      } = e.data;
      const remotePlayer = playersMap.get(playerId);
      if (remotePlayer) {
        playersMap.remove(playerId);
        result.dispatchEvent(new MessageEvent('leave', {
          data: {
            player: remotePlayer,
          },
        }));
      } else {
        result.log('remote player not found during leave', playerId);
        throw new Error('remote player not found during leave');
      }
    });
    agentMultiplayerConnection.addEventListener(METHOD_NAMES[METHODS.TYPING], e => {
      const {
        playerId,
        typing,
      } = e.data;
      typingMap.set(playerId, typing);
    });
    agentMultiplayerConnection.addEventListener(METHOD_NAMES[METHODS.SPEAKING], e => {
      const {
        playerId,
        speaking,
      } = e.data;
      speakerMap.set(playerId, speaking);
    });
    agentMultiplayerConnection.addEventListener(METHOD_NAMES[METHODS.SET_PLAYER_DATA], e => {
      const {
        playerId,
        playerData,
      } = e.data;
      const player = playersMap.get(playerId);
      if (player) {
        player.setPlayerData(playerData);
      } else {
        result.log('player not found during set player data', playerId);
        throw new Error('player not found during set player data: ' + playerId);
      }
    });
    [
      'close',
      'error',
    ].forEach(eventName => {
      agentMultiplayerConnection.addEventListener(eventName, e => {
        result.dispatchEvent(new MessageEvent(eventName, {
          data: e.data,
        }));
      });
    });

    return result;
  }

  static logLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };
  static defaultLogLevel = ReactAgentsMultiplayerConnection.logLevels.info;

  /* room;
  profile;
  metadata;
  playersMap = new PlayersMap();
  typingMap = new TypingMap();
  speakerMap = new SpeakerMap();
  realms;
  connectPromise;
  // constructor({
  //   room,
  //   profile,
  //   metadata = {},
  // }) {
  //   super();

  //   this.room = room;
  //   this.profile = profile;
  //   this.metadata = metadata;

  //   this.connectPromise = this.connect();
  // }
  log(...args) {
    this.dispatchEvent(new MessageEvent('log', {
      data: {
        args,
        logLevel: ReactAgentsMultiplayerConnection.logLevels.info,
      },
    }));
  }
  async connect() {
    const {
      room,
      profile,
      playersMap,
      typingMap,
      speakerMap,
    } = this;
    const userId = profile.id;

    // join the room
    const realms = new NetworkRealms({
      endpointUrl: multiplayerEndpointUrl,
      playerId: userId,
    });
    this.realms = realms;
  
    // const virtualWorld = realms.getVirtualWorld();
    const virtualPlayers = realms.getVirtualPlayers();
  
    // this.log('waiting for initial connection...');
  
    let connected = false;
    const {
      promise: realmsConnectPromise,
      resolve: realmsConnectResolve,
      reject: realmsConnectReject,
    } = Promise.withResolvers();
    const onConnect = async (e) => {
      // this.log('on connect...');

      const existingAgentIds = Array.from(playersMap.getMap().keys());
      if (existingAgentIds.includes(userId)) {
        this.log('your character is already in the room! disconnecting.');
        realms.disconnect();
        return;
      }

      // initialize the local player
      const localPlayer = new Player(userId, profile);

      // push the local player to the network
      {
        const realmKey = e.data.rootRealmKey;
        realms.localPlayer.initializePlayer(
          {
            realmKey,
          },
          {},
        );
        realms.localPlayer.setKeyValue(
          'playerSpec',
          localPlayer.getPlayerSpec(),
        );
      }

      // add the local player to the players map
      playersMap.add(userId, localPlayer);

      connected = true;

      this.dispatchEvent(new MessageEvent('join', {
        data: {
          player: localPlayer,
        },
      }));

      realmsConnectResolve();
    };
    realms.addEventListener('connect', onConnect);
  
    const _trackRemotePlayers = () => {
      virtualPlayers.addEventListener('join', (e) => {
        const { playerId, player } = e.data;

        const playerSpec = player.getKeyValue('playerSpec');
        if (connected) {
          // this.log('react agents client: remote player joined:', playerId);
        // } else {
        //   this.log('remote player joined before connection', playerId);
        //   throw new Error('remote player joined before connection: ' + playerId);
        }
  
        const remotePlayer = new Player(playerId, playerSpec);
        // do not add the player until it has the playerSpec set
        // we listen for the 'update' event below to handle this case
        // this can be implemented more synchronously, but it would require multiplayer server changes to initialize the player spec at join time
        if (remotePlayer.getPlayerSpec()) {
          playersMap.add(playerId, remotePlayer);
        }

        // Handle remote player state updates
        player.addEventListener('update', e => {
          const { key, val } = e.data;
          if (key === 'playerSpec') {
            remotePlayer.setPlayerSpec(val);
            if (!playersMap.has(playerId)) {
              playersMap.add(playerId, remotePlayer);
              // dispatch join event when the playerSpec is updated and the player is not already in the playersMap
              this.dispatchEvent(new MessageEvent('join', {
                data: {
                  player: remotePlayer,
                },
              }));
            }
            this.dispatchEvent(new MessageEvent('playerSpecUpdate', {
              data: {
                player: remotePlayer,
              },
            }));
          }
        });

        // Do not add the player or dispatch join event until it has the playerSpec set
        if (remotePlayer.getPlayerSpec()) {
          this.dispatchEvent(new MessageEvent('join', {
            data: {
              player: remotePlayer,
            },
          }));
        }
      });
      virtualPlayers.addEventListener('leave', e => {
        const { playerId } = e.data;
        if (connected) {
          // this.log('react agents client: remote player left:', playerId);
        // } else {
        //   this.log('remote player left before connection', playerId);
        //   throw new Error('remote player left before connection: ' + playerId);
        }
  
        // remove remote player
        const remotePlayer = playersMap.get(playerId);
        if (remotePlayer) {
          playersMap.remove(playerId);
        } else {
          this.log('remote player not found during player remove', playerId);
          throw new Error('remote player not found during player remove');
        }

        this.dispatchEvent(new MessageEvent('leave', {
          data: {
            player: remotePlayer,
          },
        }));
      });
      // map multimedia events virtualPlayers -> playersMap
      [
        'audio',
        'audiostart',
        'audioend',
        'video',
        'videostart',
        'videoend',
      ].forEach(eventName => {
        virtualPlayers.addEventListener(eventName, e => {
          playersMap.dispatchEvent(new MessageEvent(eventName, {
            data: e.data,
          }));
          this.dispatchEvent(new MessageEvent(eventName, {
            data: e.data,
          }));
        });
      });
    };
    _trackRemotePlayers();
  
    const _bindMultiplayerChat = () => {
      const onchat = (e) => {
        this.dispatchEvent(new MessageEvent('chat', {
          data: e.data,
        }));
      };
      realms.addEventListener('chat', onchat);

      realms.addEventListener('disconnect', (e) => {
        this.dispatchEvent(new MessageEvent('disconnect', {
          data: e.data,
        }));

        playersMap.clear();
        typingMap.clear();
        speakerMap.clear();
      });
    };
    _bindMultiplayerChat();
  
    await realms.updateRealmsKeys({
      realmsKeys: [room],
      rootRealmKey: room,
    });

    await realmsConnectPromise;

    this.dispatchEvent(new MessageEvent('connect', {
      data: null,
    }));
  }
  disconnect() {
    this.realms.disconnect();
  }
  async waitForConnect() {
    return await this.connectPromise;
  }
  sendChatMessage(message) {
    return this.realms.sendChatMessage(message);
  }
  addAudioSource(audioSource) {
    return this.realms.addAudioSource(audioSource);
  }
  removeAudioSource(audioSource) {
    return this.realms.removeAudioSource(audioSource);
  }
  addVideoSource(videoSource) {
    return this.realms.addVideoSource(videoSource);
  }
  removeVideoSource(videoSource) {
    return this.realms.removeVideoSource(videoSource);
  } */
}

export const connect = async ({
  room,
  profile,
  signal,
}) => {
  const u = `${multiplayerEndpointUrl}/room/${room}/websocket`;
  const agentMultiplayerConnection = await agentMultiplayer.connect(u, {
    signal,
  });
  const ramConnection = await ReactAgentsMultiplayerConnection.connect({
    agentMultiplayerConnection,
    profile,
    signal,
  });
  return ramConnection;
};