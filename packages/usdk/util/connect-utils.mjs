import repl from 'repl';
import util from 'util';

import dedent from 'dedent';
import open from 'open';
import alea from 'alea';
import pc from 'picocolors';
import { uniqueNamesGenerator, adjectives, colors, animals } from 'unique-names-generator';

import { QueueManager } from 'queue-manager-async';
// import { lembed } from '../packages/upstreet-agent/packages/react-agents/util/embedding.mjs';
import { makeId } from '../packages/upstreet-agent/packages/react-agents/util/util.mjs';
import { parseAgentSpecs } from '../lib/agent-spec-utils.mjs';
import { getUserForJwt } from '../packages/upstreet-agent/packages/react-agents/util/jwt-utils.mjs';

import {
  deployEndpointUrl,
  chatEndpointUrl,
  workersHost,
  aiProxyHost,
  usdkDiscordUrl,
  multiplayerEndpointUrl,
} from '../packages/upstreet-agent/packages/react-agents/util/endpoints.mjs';

import {
  InputDevices,
} from '../packages/upstreet-agent/packages/react-agents/devices/input-devices.mjs';
import {
  AudioInput,
} from '../packages/upstreet-agent/packages/react-agents/devices/audio-input.mjs';
import {
  ImageRenderer,
  TerminalVideoRenderer,
} from '../packages/upstreet-agent/packages/react-agents/devices/video-input.mjs';
import { getLoginJwt } from '../util/login-util.mjs';
// import { ReactAgentsClient, ReactAgentsMultiplayerConnection } from '../packages/upstreet-agent/packages/react-agents-client/react-agents-client.mjs';
import * as reactAgentsClient from '../packages/upstreet-agent/packages/react-agents-client/react-agents-client.mjs';
// XXX finish this
import { AudioDecodeStream } from 'agent-codecs/audio-decode.mjs';
import * as codecs from 'agent-codecs/ws-codec-runtime-fs.mjs';
import { webbrowserActionsToText } from '../packages/upstreet-agent/packages/react-agents/util/browser-action-utils.mjs';

import {
  getAgentPublicUrl,
  getCloudAgentHost,
} from '../packages/upstreet-agent/packages/react-agents/agent-defaults.mjs';
import {
  devServerPort,
} from '../packages/upstreet-agent/packages/react-agents-wrangler/util/ports.mjs';
import {
  getLocalAgentHost,
} from '../packages/upstreet-agent/packages/react-agents-wrangler/util/hosts.mjs';
import { Jimp } from 'jimp';
import { consoleImageWidth } from '../packages/upstreet-agent/packages/react-agents/constants.mjs';

//

const eraseLine = '\x1b[2K\r';

//

const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const shortName = () => uniqueNamesGenerator({
  dictionaries: [adjectives, adjectives, colors, animals],
  separator: ' ',
});
const makeName = () => capitalize(shortName());

const getAgentSpecHost = (agentSpec) => !!agentSpec.directory ? getLocalAgentHost(agentSpec.portIndex) : getCloudAgentHost(agentSpec.guid);

const getUserProfile = async () => {
  let user = null;

  // try getting the user asset from the login
  const jwt = await getLoginJwt();
  if (jwt !== null) {
    user = await getUserForJwt(jwt);
  }

  // use a default asset spec
  if (!user) {
    const userId = crypto.randomUUID();
    user = {
      id: userId,
      name: makeName(),
      description: '',
    };
  }

  return user;
};

const agentJoin = async ({
  agentUrl,
  endpointUrl,
  room,
  only,
}) => {
  const res = await fetch(`${agentUrl}/join`, {
    method: 'POST',
    body: JSON.stringify({
      endpointUrl,
      room,
      only,
    }),
  });
  const json = await res.json();
  return json;
};

const agentLeave = async ({
  agentUrl,
  endpointUrl,
  room,
}) => {
  const res = await fetch(`${agentUrl}/leave`, {
    method: 'POST',
    body: JSON.stringify({
      endpointUrl,
      room,
    }),
  });
  const json = await res.json();
  return json;
};

const startMultiplayerRepl = ({
  profile,
  realms,
  typingMap,
  speakerMap,
}) => {
  const getPrompt = () => {
    const name = profile.name;

    let s = `${name} (you): `;
    
    // typing
    const tm = typingMap.getMap();
    const specs = Array.from(tm.values()).filter((spec) => spec.typing);
    if (specs.length > 0) {
      const names = specs.map((spec) => spec.name);
      const typingLine = `[${names.join(', ')} ${specs.length > 1 ? 'are' : 'is'} typing...] `;
      s = typingLine + s;
    }

    // speaking
    const localSpeaking = speakerMap.getLocal() > 0;
    if (localSpeaking) {
      s = `[🎤] ` + s;
    }

    return s;
  };
  const updatePrompt = () => {
    replServer.setPrompt(getPrompt());
  };
  const renderPrompt = () => {
    replServer.displayPrompt(true);
  };
  typingMap.addEventListener('typingchange', (e) => {
    updatePrompt();
    renderPrompt();
  });
  speakerMap.addEventListener('localspeakingchange', (e) => {
    updatePrompt();
    renderPrompt();
  });

  const getDoc = () => {
    const headRealm = realms.getClosestRealm(realms.lastRootRealmKey);
    const { networkedCrdtClient } = headRealm;
    const doc = networkedCrdtClient.getDoc();
    return doc;
  };

  let microphoneInput = null;
  const microphoneQueueManager = new QueueManager();
  const toggleMic = async () => {
    await microphoneQueueManager.waitForTurn(async () => {
      if (!microphoneInput) {
        console.log('* starting mic *');

        const jwt = await getLoginJwt();
        if (!jwt) {
          throw new Error('not logged in');
        }

        const inputDevices = new InputDevices();
        const devices = await inputDevices.listDevices();
        const device = inputDevices.getDefaultMicrophoneDevice(devices.audio);
        
        const sampleRate = AudioInput.defaultSampleRate;
        microphoneInput = inputDevices.getAudioInput(device.id, {
          sampleRate,
        });

        const onplayingchange = e => {
          const { playing } = e.data;
          // console.log('playing change', playing);
          if (playing) {
            microphoneInput.pause();
          } else {
            microphoneInput.resume();
          }
        };
        speakerMap.addEventListener('playingchange', onplayingchange);
        microphoneInput.on('close', e => {
          speakerMap.removeEventListener('playingchange', onplayingchange);
        });

        await new Promise((accept, reject) => {
          microphoneInput.on('start', e => {
            accept();
          });
        });
        console.log('* mic enabled *');

        const audioStream = new ReadableStream({
          start(controller) {
            microphoneInput.on('data', (data) => {
              controller.enqueue(data);
            });
            microphoneInput.on('end', (e) => {
              controller.close();
            });
          },
        });
        audioStream.id = crypto.randomUUID();
        audioStream.type = 'audio/pcm-f32-48000';
        audioStream.disposition = 'text';

        (async () => {
          // console.log('start streaming audio');
          const {
            waitForFinish,
          } = realms.addAudioSource(audioStream);
          await waitForFinish();
          realms.removeAudioSource(audioStream);
        })();
        renderPrompt();
      } else {
        microphoneInput.close();
        microphoneInput = null;
        console.log('* mic disabled *');
        renderPrompt();
      }
    });
  };
  let cameraInput = null;
  const cameraQueueManager = new QueueManager();
  const toggleCam = async () => {
    await cameraQueueManager.waitForTurn(async () => {
      if (!cameraInput) {
        console.log('* starting camera *');

        const inputDevices = new InputDevices();
        const devices = await inputDevices.listDevices();
        const cameraDevice = inputDevices.getDefaultCameraDevice(devices.video);

        cameraInput = inputDevices.getVideoInput(cameraDevice.id, {
          // width,
          // height,
          fps: 5,
        });

        const videoRenderer = new TerminalVideoRenderer({
          width: 80,
          // height: rows,
          footerHeight: 5,
        });
        cameraInput.on('frame', (imageData) => {
          videoRenderer.setImageData(imageData);
          videoRenderer.render();
          renderPrompt();
        });
        console.log('* camera enabled *');

        const cameraStream = new ReadableStream({
          start(controller) {
            cameraInput.on('image', (data) => {
              controller.enqueue(data);
            });
            cameraInput.on('close', (e) => {
              controller.close();
            });
          },
        });
        cameraStream.id = crypto.randomUUID();
        cameraStream.type = 'image/webp';
        cameraStream.disposition = 'text';

        (async () => {
          // console.log('start streaming video');
          const {
            waitForFinish,
          } = realms.addVideoSource(cameraStream);
          await waitForFinish();
          realms.removeVideoSource(cameraStream);
        })();
        renderPrompt();
      } else {
        cameraInput.close();
        cameraInput = null;
        console.log('* cam disabled *');
        renderPrompt();
      }
    });
  };

  let screenInput = null;
  const screenQueueManager = new QueueManager();
  const toggleScreen = async () => {
    await screenQueueManager.waitForTurn(async () => {
      if (!screenInput) {
        console.log('* starting screen capture *');

        const inputDevices = new InputDevices();
        const devices = await inputDevices.listDevices();
        const screenDevice = inputDevices.getDefaultScreenDevice(devices.video);

        screenInput = inputDevices.getVideoInput(screenDevice.id, {
          // width,
          // height,
          fps: 5,
        });

        const videoRenderer = new TerminalVideoRenderer({
          width: 80,
          // height: rows,
          footerHeight: 5,
        });
        screenInput.on('frame', (imageData) => {
          videoRenderer.setImageData(imageData);
          videoRenderer.render();
          renderPrompt();
        });
        console.log('* screen capture enabled *');

        const screenStream = new ReadableStream({
          start(controller) {
            screenInput.on('image', (data) => {
              controller.enqueue(data);
            });
            screenInput.on('close', (e) => {
              controller.close();
            });
          },
        });
        screenStream.id = crypto.randomUUID();
        screenStream.type = 'image/webp';
        screenStream.disposition = 'text';

        (async () => {
          // console.log('start streaming screen');
          const {
            waitForFinish,
          } = realms.addVideoSource(screenStream);
          await waitForFinish();
          realms.removeVideoSource(screenStream);
        })();
        renderPrompt();
      } else {
        screenInput.close();
        screenInput = null;
        console.log('* screen capture disabled *');
        renderPrompt();
      }
    });
  };

  const sendChatMessage = async (text) => {
    const userId = profile.id;
    const name = profile.name;
    await realms.sendChatMessage({
      method: 'say',
      userId,
      name,
      args: {
        text,
      },
      timestamp: Date.now(),
    });
  };

  const replServer = repl.start({
    prompt: getPrompt(),
    eval: async (cmd, context, filename, callback) => {
      let error = null;
      try {
        cmd = cmd.replace(/;?\s*$/, '');

        if (cmd) {
          const cmdSplit = cmd.split(/\s+/);
          const commandMatch = (cmdSplit[0] ?? '').match(/^\/(\S+)/);
          if (commandMatch) {
            const command = commandMatch ? commandMatch[1] : null;
            switch (command) {
              case 'get': {
                const key = cmdSplit[1];

                const doc = getDoc();
                if (key) {
                  const text = doc.getText(key);
                  const s = text.toString();
                  console.log(s);
                } else {
                  const j = doc.toJSON();
                  console.log(j);
                }
                break;
              }
              case 'set': {
                const key = cmdSplit[1];
                const value = cmdSplit[2];

                if (key && value) {
                  const doc = getDoc();
                  doc.transact(() => {
                    const text = doc.getText(key);
                    text.delete(0, text.length);
                    text.insert(0, value);
                  });
                } else {
                  throw new Error('expected 2 arguments');
                }
                break;
              }
              case 'mic': {
                toggleMic();
                break;
              }
              case 'cam': {
                toggleCam();
                break;
              }
              case 'screen': {
                toggleScreen();
                break;
              }
              default: {
                console.log('unknown command', command);
                break;
              }
            }
          } else {
            await sendChatMessage(cmd);
          }
        }
      } catch (err) {
        error = err;
      }
      callback(error);
    },
    ignoreUndefined: true,
  });

  replServer.on('exit', (e) => {
    process.exit(0);
  });

  return replServer;
};

//

export const makeRoomName = (s) => {
  const suffix = typeof s === 'string' ? makeId(8, alea(s)) : makeId(8);
  return `room:${suffix}`;
};

const connectBrowser = ({
  room,
}) => {
  open(`${chatEndpointUrl}/rooms/${room}`)
    .catch( console.error );
};
const connectRepl = async ({
  room,
  debug,
}) => {
  let profile = await getUserProfile();
  if (!profile) {
    throw new Error('could not get user profile');
  }
  profile = {
    ...profile,
    capabilities: [
      'human',
    ],
  };

  let replServer = null;

  // set up the chat
  const multiplayerConnection = new ReactAgentsMultiplayerConnection({
    room,
    profile,
  });
  const localLogLevel = debug ? ReactAgentsMultiplayerConnection.logLevels.debug : ReactAgentsMultiplayerConnection.logLevels.info;
  const renderPrompt = () => {
    replServer && replServer.displayPrompt(true);
  };
  const mpLog = (...args) => {
    process.stdout.write(eraseLine);
    console.log(...args);
    renderPrompt();
  };
  multiplayerConnection.addEventListener('log', (e) => {
    const { args, logLevel } = e.data;
    if (localLogLevel >= logLevel) {
      mpLog(...args);
    }
  });
  multiplayerConnection.addEventListener('chat', (e) => {
    const { message } = e.data;
    const { userId: messageUserId, name, method, args } = message;
    // console.log('got message', message);
    const attachments = (message.attachments ?? []).filter(a => !!a.url);

    switch (method) {
      case 'say': {
        const { text } = args;
        if (messageUserId !== profile.id) {
          let s = `${name}: ${text}`;
          if (attachments.length > 0) {
            s += '\n[Attachments:';
            for (const attachment of attachments) {
              const { type, url } = attachment;
              s += `\n  [${type}]: ${url}`;
            }
            s += '\n]';
          }
          mpLog(s);

          // read attachments and print them to the console if we can
          if (attachments) {
            for (const attachment of attachments) {
              if (attachment.type.startsWith('image/')) {
                (async () => {
                  const { url } = attachment;

                  const res = await fetch(url);
                  const ab = await res.arrayBuffer();

                  const b = Buffer.from(ab);
                  const jimp = await Jimp.read(b);

                  const imageRenderer = new ImageRenderer();
                  const {
                    text: imageText,
                  } = imageRenderer.render(jimp.bitmap, consoleImageWidth, undefined);
                  console.log(`${url}:`);
                  console.log(imageText);
                })();
              }
            }
          }
          }
        break;
      }
      case 'log': {
        if (debug) {
          const { text } = args;
          mpLog(text);
        }
        break;
      }
      case 'typing': {
        const { typing } = args;
        typingMap.set(messageUserId, { userId: messageUserId, name, typing });
        break;
      }
      case 'mediaPerception': {
        mpLog(`[${name} checked an attachment`);
        break;
      }
      case 'addMemory': {
        mpLog(`[${name} will remember that]`);
        break;
      }
      case 'queryMemories': {
        mpLog(`[${name} is trying to remember]`);
        break;
      }
      case 'browserAction': {
        const {
          method: method2,
          args: args2,
          result,
          error,
        } = args;
        const webbrowserAction = webbrowserActionsToText.find((action) => action.method === method2);
        if (webbrowserAction) {
          // get the agent from the player spec
          const player = playersMap.get(messageUserId);
          // console.log('got player', player);
          let agent = player?.playerSpec;
          // console.log('got agent', agent);
          if (!agent) {
            console.warn('no agent for browserAction message user id', messageUserId);
            // debugger;
            agent = {};
          }
          const o = {
            // get the agent from the local player spec
            agent,
            method: method2,
            args: args2,
            result,
            error,
          };
          mpLog(`[${webbrowserAction.toText(o)}]`);
        }
        // mpLog(`[${name} checked an attachment`);
        break;
      }
      case 'paymentRequest': {
        const {
          type,
          props,
        } = args;
        const {
          amount,
          currency,
          interval,
          intervalCount,
        } = props;
        const price = (() => {
          const v = amount / 100;
          if (currency === 'usd') {
            return `$${v}`;
          } else {
            return `${v} ${currency.toUpperCase()}`;
          }
        })();
        const subscriptionText = type === 'subscription' ? ` per ${interval}${intervalCount !== 1 ? 's' : ''}` : '';
        mpLog(`[${name} requests ${price}${subscriptionText} for ${type} ${props.name}${props.description ? `: ${props.description}` : ''}]`);
        // const { amount, currency, url, productName, productDescription, productQuantity } = args;
        // mpLog(`[${name} requests ${amount / 100} ${currency} for ${productQuantity} x ${productName}]: ${url}`);
        break;
      }
      case 'nudge':
      case 'join':
      case 'leave': {
        // nothing
        break;
      }
      default: {
        mpLog(`${name}: ${JSON.stringify(message)}`);
        break;
      }
    }
  });
  await multiplayerConnection.waitForConnect();
  const { realms, typingMap, playersMap, speakerMap } = multiplayerConnection;
  const agentJsons = Array.from(playersMap.getMap().values()).map(
    (player) => player.playerSpec,
  );
  mpLog(dedent`\
    ${profile ? `You are ${JSON.stringify(profile.name)} [${profile.id}]), chatting in ${room}.` : ''}
    ${agentJsons.length > 0 ?
      agentJsons
        .map((agent) => {
          return `* ${agent.name} [${agent.id}] ${agent.id === profile.id ? '(you)' : ''}`;
        })
        .join('\n')
      :
        `* no one else is here`
    }
  `);

  replServer = startMultiplayerRepl({
    profile,
    realms,
    typingMap,
    speakerMap,
  });

  const _trackAudio = () => {
    const audioStreams = new Map();
    const audioQueueManger = new QueueManager();
    const virtualPlayers = realms.getVirtualPlayers();
    virtualPlayers.addEventListener('audiostart', e => {
      const {
        playerId,
        streamId,
        type,
        disposition,
      } = e.data;

      if (disposition === 'audio') {
        const outputStream = new SpeakerOutputStream();
        const { sampleRate } = outputStream;

        // decode stream
        const decodeStream = new AudioDecodeStream({
          type,
          sampleRate,
          codecs,
          format: 'i16',
        });

        (async () => {
          await audioQueueManger.waitForTurn(async ({
            signal,
          }) => {
            signal.addEventListener('abort', (e) => {
              decodeStream.abort(e.reason);
              outputStream.abort(e.reason);
            });

            try {
              speakerMap.addRemote(playerId);
              await decodeStream.readable.pipeTo(outputStream);
            } finally {
              speakerMap.removeRemote(playerId);
            }
          });
        })().catch((e) => {
          console.error('error in audio pipeline', e);
        });

        const writer = decodeStream.writable.getWriter();
        writer.metadata = {
          playerId,
        };
        audioStreams.set(streamId, writer);
      }
    });
    virtualPlayers.addEventListener('audio', e => {
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
    virtualPlayers.addEventListener('audioend', e => {
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
  // dynamic import audio output module
  const audioOutput = await (async () => {
    try {
      return await import('../packages/upstreet-agent/packages/react-agents/devices/audio-output.mjs');
    } catch (err) {
      console.warn(pc.yellow(`\
⚠️  Could not run the speaker module. You may not be able to hear your Agent.
To solve this, you may need to install optional dependencies. https://docs.upstreet.ai/errors#could-not-run-the-speaker-module
For further assistance, please contact support or ask for help in our Discord community: ${usdkDiscordUrl}
        `));
      return null;
    }
  })();
  const SpeakerOutputStream = audioOutput?.SpeakerOutputStream;
  if (SpeakerOutputStream) {
    _trackAudio();
  }
};
const connectStream = async ({
  room,
  inputStream,
  outputStream,
  debug,
}) => {
  if (!inputStream) {
    throw new Error('no inputStream provided');
  }
  if (!outputStream) {
    throw new Error('no outputStream provided');
  }

  let profile = await getUserProfile();
  if (!profile) {
    throw new Error('could not get user profile');
  }
  profile = {
    ...profile,
    capabilities: [
      'human',
    ],
  };

  // set up the chat
  const multiplayerConnection = new ReactAgentsMultiplayerConnection({
    room,
    profile,
  });
  const localLogLevel = debug ? ReactAgentsMultiplayerConnection.logLevels.debug : ReactAgentsMultiplayerConnection.logLevels.info;
  const mpLog = (...args) => {
    // use util.format to format the message
    const s = args.map((arg) => {
      if (typeof arg === 'string') {
        return arg;
      } else {
        return util.format(arg);
      }
    }).join(' ');
    outputStream.write(s);
  };
  multiplayerConnection.addEventListener('log', (e) => {
    const { args, logLevel } = e.data;
    if (localLogLevel >= logLevel) {
      mpLog(...args);
    }
  });
  multiplayerConnection.addEventListener('chat', (e) => {
    const { message } = e.data;
    const method = message?.method;
    const args = message?.args;
    switch (method) {
      case 'say': {
        const { name } = message;
        const { text } = args;
        outputStream.write(`${name}: ${text}\n`);
        break;
      }
      // default: {
      //   // nothing
      //   break;
      // }
    }
  });
  await multiplayerConnection.waitForConnect();
  const { realms, typingMap, playersMap, speakerMap } = multiplayerConnection;
  const agentJsons = Array.from(playersMap.getMap().values()).map(
    (player) => player.playerSpec,
  );
  mpLog(dedent`\
    ${profile ? `You are ${JSON.stringify(profile.name)} [${profile.id}]), chatting in ${room}.` : ''}
    In the room (${room}):
    ${agentJsons.length > 0 ?
      agentJsons
        .map((agent) => {
          return `* ${agent.name} [${agent.id}] ${agent.id === profile.id ? '(you)' : ''}`;
        })
        .join('\n')
      :
        `* no one else is here`
    }
    http://local.upstreet.ai:${devServerPort}
  `);

  // read input stream
  const sendChatMessage = async (text) => {
    const userId = profile.id;
    const name = profile.name;
    await realms.sendChatMessage({
      method: 'say',
      userId,
      name,
      args: {
        text,
      },
      timestamp: Date.now(),
    });
  };
  inputStream.setEncoding('utf8');
  inputStream.on('data', (data) => {
    const text = data;
    sendChatMessage(text);
  });
};
const connectElectron = async ({
  room,
  jwt,
  debug,
  runtimes,
}) => {
  // let profile = await getUserProfile();
  // if (!profile) {
  //   throw new Error('could not get user profile');
  // }
  // profile = {
  //   ...profile,
  //   capabilities: [
  //     'human',
  //   ],
  // };

  const openPromises = runtimes.map(async (runtime) => {
    await runtime.open({
      room,
      jwt,
      debug,
    });
  });
  await Promise.all(openPromises);
};
export const connect = async (args) => {
  const room = args._[0] ?? '';
  const mode = args.mode ?? 'repl';
  const inputStream = args.inputStream ?? null;
  const outputStream = args.outputStream ?? null;
  const runtimes = args.runtimes ?? null;
  const jwt = args.jwt ?? null;
  const debug = parseInt(args.debug, 10);

  if (room) {
    switch (mode) {
      case 'browser': {
        connectBrowser({
          room,
        });
        break;
      }
      case 'stream': {
        connectStream({
          room,
          inputStream,
          outputStream,
          debug,
        });
        break;
      }
      case 'electron': {
        connectElectron({
          room,
          jwt,
          debug,
          runtimes,
        });
        break;
      }
      case 'repl': {
        connectRepl({
          room,
          debug,
        });
        break;
      }
      default: {
        throw new Error(`unknown mode: ${mode}`);
      }
    }
  } else {
    console.log('no room name provided');
    process.exit(1);
  }
};

export const join = async (args) => {
  const agentSpecs = await parseAgentSpecs(args._[0]);
  const room = args._[1] ?? '';
  
  if (room) {
    try {
      const joinPromises = agentSpecs.map(async (agentSpec) => {
        const agentUrl = `${getAgentSpecHost(agentSpec)}`;
        await agentJoin({
          agentUrl,
          endpointUrl: multiplayerEndpointUrl,
          room,
          only: true,
        });

        // const u = `${getAgentSpecHost(agentSpec)}`;
        // const agentClient = new ReactAgentsClient(u);
        // await agentClient.join(room, {
        //   only: true,
        // });
      });
      await Promise.all(joinPromises);
    } catch (err) {
      console.warn('join error', err);
      process.exit(1);
    }
  } else {
    console.log('no room name provided');
    process.exit(1);
  }
};
export const leave = async (args) => {
  const agentSpecs = await parseAgentSpecs(args._[0]);
  const room = args._[1] ?? '';

  if (agentSpecs.length === 1) {
    if (room) {
      const _leaveAgent = async (agentSpec, room) => {
        const agentUrl = `${getAgentSpecHost(agentSpec)}`;
        await agentLeave({
          agentUrl,
          endpointUrl: multiplayerEndpointUrl,
          room,
        });

        // const u = `${getAgentSpecHost(agentSpec)}/leave`;
        // const leaveReq = await fetch(u, {
        //   method: 'POST',
        //   body: JSON.stringify({
        //     room,
        //   }),
        // });
        // const leaveJson = await leaveReq.json();
      };

      return await _leaveAgent(agentSpecs[0], room);
    } else {
      console.log('no room name provided');
      process.exit(1);
    }
  } else {
    console.log('expected 1 agent argument');
    process.exit(1);
  }
};