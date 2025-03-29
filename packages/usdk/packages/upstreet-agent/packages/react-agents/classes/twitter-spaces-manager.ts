import uuidByString from 'uuid-by-string';
import type {
  ActiveAgentObject,
  TwitterSpacesArgs,
  PlayableAudioStream,
  ExtendableMessageEvent,
  ActionMessageEventData,
} from './types';
import { createBrowser/*, testBrowser*/ } from '../util/create-browser.mjs';
import {
  ConversationObject,
} from './conversation-object';
import {
  bindConversationToAgent,
} from '../runtime';
import { AudioDecodeStream } from 'codecs/audio-decode.mjs';
import { createMessageCache, formatConversationMessage } from '../util/message-utils';
import {
  QueueManager,
} from 'queue-manager';
import {
  AudioMerger,
} from '../util/audio-merger.mjs';
import {
  TranscribedVoiceInput,
} from '../devices/audio-transcriber.mjs';
import { Player } from 'react-agents-client/util/player.mjs';

//

const getIdFromUserId = (userId: string) => uuidByString(userId);

//

class TwitterSpacesBot {
  token: string;
  url: string;
  abortController: AbortController;
  agent: ActiveAgentObject;
  codecs: any;
  jwt: string;
  conversations: Map<string, ConversationObject>; // tweetId -> conversation

  constructor(args: TwitterSpacesArgs) {
    const {
      token,
      url,
      agent,
      codecs,
      jwt,
    } = args;

    if (!token) {
      throw new Error('Twitter bot requires a token');
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

    this.token = token;
    this.url = url;
    this.agent = agent;
    this.codecs = codecs;
    this.jwt = jwt;
    this.conversations = new Map();

    this.abortController = new AbortController();
    const { signal } = this.abortController;

    const subcommand = url ? 'connect' : 'create';

    const _start = async () => {
      let live = true;
      signal.addEventListener('abort', () => {
        live = false;
      });

      const agentPlayer = new Player(this.agent.id, {
        name: this.agent.name,
        bio: this.agent.bio,
      });
      const conversation = new ConversationObject({
        agentPlayer,
        getHash: () => {
          return `twitterSpaces:channel:${url}`;
        },
        messageCache: createMessageCache({
          agent,
          conversationId: `twitterSpaces:channel:${url}`,
          agentId: agent.id,
        }),
      });

      this.agent.conversationManager.addConversation(conversation);
      signal.addEventListener('abort', () => {
        this.agent.conversationManager.removeConversation(conversation);
      });

      bindConversationToAgent({
        agent,
        conversation,
      });

      function float32ToBase64(f32) {
        const uint8Array = new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength);
        return uint8ArrayToBase64(uint8Array);
      }
      function uint8ArrayToBase64(uint8Array) {
        let binaryString = '';
        const chunkSize = 1024; // Process 1 KB chunks at a time
        for (let i = 0; i < uint8Array.length; i += chunkSize) {
          const chunk = uint8Array.subarray(i, i + chunkSize);
          binaryString += String.fromCharCode(...chunk);
        }
        return btoa(binaryString);
      }
      function base64ToUint8Array(base64) {
        if (base64) {
          const binaryString = atob(base64);
          const uint8Array = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            uint8Array[i] = binaryString.charCodeAt(i);
          }
          return uint8Array;
        } else {
          return new Uint8Array(0);
        }
      }
      function base64ToFloat32Array(base64) {
        const uint8Array = base64ToUint8Array(base64);
        return new Float32Array(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength / Float32Array.BYTES_PER_ELEMENT);
      }

      const _checkAbort = async (abortFn = () => {}) => {
        if (!live) {
          await abortFn();
          return true;
        } else {
          signal.addEventListener('abort', async () => {
            await abortFn();
          });
          return false;
        }
      };
      const _decorateBrowser = async (browser) => {
        // helpers
        const postDown = async (eventType, args) => {
          await page.evaluate((opts) => {
            const {
              eventType,
              args,
            } = opts;
            if (typeof postDown === 'function') {
              postDown(eventType, args);
            } else {
              throw new Error('postDown() was not found on the page!');
            }
          }, {
            eventType,
            args,
          });
        };
        /* const createAudioGenerator = ({
          sampleRate,
        }) => {
          const startTimestamp = Date.now();
          let lastTimestamp = startTimestamp;
          const frequency = 440; // Hz
          const _processAudio = () => {
            const currentTimestamp = Date.now();
            const numSamplesOld = Math.floor((lastTimestamp - startTimestamp) / 1000 * sampleRate);
            const numSamplesNew = Math.floor((currentTimestamp - startTimestamp) / 1000 * sampleRate);
            const numSamples = numSamplesNew - numSamplesOld;

            // create the audio buffer with the exact number of samples needed
            const f32 = new Float32Array(numSamples);

            // sine wave continuing from last timestamp
            const period = sampleRate / frequency;
            for (let i = 0; i < numSamples; i++) {
              const sampleIndex = numSamplesOld + i;
              f32[i] = Math.sin(2 * Math.PI * (sampleIndex / period));
            }

            const base64 = float32ToBase64(f32);
            console.log('postDown audio', f32.length);
            postDown('audio', base64);

            lastTimestamp = currentTimestamp;
          };

          // start
          _processAudio();
          const intervalMs = 1000;
          const interval = setInterval(() => {
            _processAudio();
          }, intervalMs);
          return {
            close: () => {
              clearInterval(interval);
            },
          };
        }; */

        const context = await browser.newContext({
          permissions: ['microphone', 'camera'],
          bypassCSP: true,
        });
        if (await _checkAbort(async () => {
          await context.close();
        })) return;

        // set the auth token cookie
        await context.addCookies([
          {
            name: 'auth_token',
            value: token,
            domain: '.x.com',
            path: '/',
          },
        ].filter(Boolean));
        if (await _checkAbort()) return;

        // load the worklet files
        const workletInputFileName = 'ws-input-worklet.js';
        const workletOutputFileName = 'ws-output-worklet.js';

        // Intercept worklet requests and serve local files
        // await context.route(`**/${workletInputFileName}`, async (route) => {
        //   console.log(`serving ${workletInputFileName}`);
        //   await route.fulfill({
        //     status: 200,
        //     contentType: 'application/javascript',
        //     headers: {
        //       'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        //       'Pragma': 'no-cache',
        //       'Expires': '0',
        //       'Surrogate-Control': 'no-store',
        //       'Service-Worker-Allowed': '/',
        //       'Clear-Site-Data': '"cache", "storage"'
        //     },
        //     body: workletInput,
        //   });
        // });
        // if (await _checkAbort()) return;
        // await context.route(`**/${workletOutputFileName}`, async (route) => {
        //   console.log(`serving ${workletOutputFileName}`);
        //   await route.fulfill({
        //     status: 200,
        //     contentType: 'application/javascript',
        //     headers: {
        //       'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        //       'Pragma': 'no-cache',
        //       'Expires': '0',
        //       'Surrogate-Control': 'no-store',
        //       'Service-Worker-Allowed': '/',
        //       'Clear-Site-Data': '"cache", "storage"'
        //     },
        //     body: workletOutput,
        //   });
        // });
        if (await _checkAbort()) return;
        // context.on('request', request => {
        //   console.log('Request:', request.url());
        // });

        const page = await context.newPage();
        console.log('got page');
        if (await _checkAbort(async () => {
          await page.close();
        })) return;

        // log the page's console logs
        page.on('console', msg => {
          console.log('PAGE LOG:', msg.text());
        });
        // log page errors
        page.on('pageerror', msg => {
          console.log('PAGE ERROR:', msg.stack);
        });
        // log page close
        page.on('close', () => {
          console.log('PAGE CLOSE:', new Error().stack);
        });

        console.log('intercept 1');
        // Override RTCPeerConnection and trap the methods
        const audioStreams = new Map<string, {
          transformStream: TransformStream,
          writer: WritableStreamDefaultWriter,
        }>();
        let globalSampleRate = null;
        let audioMerger = null;
        await page.exposeFunction('postUp', async (eventType, args) => {
          console.log('post up event', {
            eventType,
            args,
          });
          switch (eventType) {
            case 'globalAudioContextInit': {
              if (!live) return;

              const { sampleRate } = args;
              globalSampleRate = sampleRate;

              audioMerger = new AudioMerger({
                sampleRate,
                // timeoutMs: 2000,
              });
              signal.addEventListener('abort', () => {
                audioMerger.end();
              });

              const transcribedVoiceInput = new TranscribedVoiceInput({
                audioInput: audioMerger,
                sampleRate,
                codecs,
                jwt,
              });
              transcribedVoiceInput.addEventListener('transcription', async (e) => {
                const text = e.data;
                console.log('got transcription text', text);
                // this.dispatchEvent(new MessageEvent('text', {
                //   data: {
                //     userId,
                //     username,
                //     text,
                //     channelId,
                //   },
                // }));

                // XXX need to identify the speaker user from the DOM elements
                const userId = 'speaker';
                const username = 'Speaker';

                const rawMessage = {
                  method: 'say',
                  args: {
                    text,
                  },
                };
                const id = getIdFromUserId(userId);
                const agent = {
                  id,
                  name: username,
                };
                const newMessage = formatConversationMessage(rawMessage, {
                  agent,
                });
                await conversation.addLocalMessage(newMessage);
              });
              break;
            }
            case 'audioInputStreamCreated': {
              if (!globalSampleRate) {
                throw new Error('globalSampleRate not set');
              }
              const sampleRate = globalSampleRate;

              const _bindOutgoingAudio = () => {
                const queueManager = new QueueManager();
                conversation.addEventListener('audiostream', async (e: MessageEvent) => {
                  await queueManager.waitForTurn(async () => {
                    const audioStream = e.data.audioStream as PlayableAudioStream;
                    const { type } = audioStream;

                    const decodeStream = new AudioDecodeStream({
                      type,
                      sampleRate,
                      format: 'f32',
                      codecs,
                    }) as TransformStream;
                    const sampleStream = decodeStream.readable;

                    // read the stream
                    const reader = sampleStream.getReader();
                    for (;;) {
                      const { done, value } = await reader.read();
                      if (!done) {
                        const f32 = value;
                        const base64 = float32ToBase64(f32);
                        postDown('audio', base64);
                      } else {
                        break;
                      }
                    }
                  });
                });
              };
              _bindOutgoingAudio();
              // const { close } = createAudioGenerator({
              //   sampleRate,
              // });
              signal.addEventListener('abort', () => {
                close();
              });
              break;
            }
            // input audio from the spaces to the agent
            case 'audioStart': {
              console.log('postUp got audioStart', typeof args, args.length);
              if (!audioMerger) {
                throw new Error('audioMerger not set');
              }
              const {
                id,
              } = args;

              const transformStream = new TransformStream();
              audioMerger.add(transformStream.readable);
              const writer = transformStream.writable.getWriter();

              const stream = {
                transformStream,
                writer,
              };
              audioStreams.set(id, stream);
              break;
            }
            case 'audio': {
              console.log('postUp got audio', typeof args, args.length);
              const { id, base64 } = args;
              const stream = audioStreams.get(id);
              if (stream) {
                const {
                  writer,
                } = stream;
                const f32 = base64ToFloat32Array(base64);
                writer.write(f32);
              } else {
                console.warn('audio: no stream found', { id });
              }
              break;
            }
            case 'audioEnd': {
              console.log('postUp got audioEnd', typeof args, args.length);
              const { id } = args;
              const stream = audioStreams.get(id);
              if (stream) {
                const {
                  writer,
                } = stream;
                writer.close();
                audioStreams.delete(id);
              } else {
                console.warn('audioEnd: no stream found', { id });
              }
              break;
            }
            default: {
              // console.log('unknown event', eventType, args);
              console.log(`postUp unhandled ${eventType}:`, JSON.stringify(args, null, 2));
              break;
            }
          }
        });
        if (await _checkAbort()) return;
        console.log('intercept 2');

        await page.addInitScript(() => {
          console.log('RTCPeerConnection override 1');

          function float32ToBase64(f32) {
            const uint8Array = new Uint8Array(f32.buffer, f32.byteOffset, f32.byteLength);
            return uint8ArrayToBase64(uint8Array);
          }
          function uint8ArrayToBase64(uint8Array) {
            let binaryString = '';
            const chunkSize = 1024; // Process 1 KB chunks at a time
            for (let i = 0; i < uint8Array.length; i += chunkSize) {
              const chunk = uint8Array.subarray(i, i + chunkSize);
              binaryString += String.fromCharCode(...chunk);
            }
            return btoa(binaryString);
          }
          function base64ToUint8Array(base64) {
            if (base64) {
              const binaryString = atob(base64);
              const uint8Array = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                uint8Array[i] = binaryString.charCodeAt(i);
              }
              return uint8Array;
            } else {
              return new Uint8Array(0);
            }
          }
          function base64ToFloat32Array(base64) {
            const uint8Array = base64ToUint8Array(base64);
            return new Float32Array(uint8Array.buffer, uint8Array.byteOffset, uint8Array.byteLength / Float32Array.BYTES_PER_ELEMENT);
          }

          // Save the original RTCPeerConnection
          const OriginalRTCPeerConnection = window.RTCPeerConnection;
          console.log('override RTCPeerConnection', OriginalRTCPeerConnection);

          // Define the custom implementation
          function CustomRTCPeerConnection(config) {
            console.log('Custom RTCPeerConnection created with config:', config);
            const original = new OriginalRTCPeerConnection(config);
            original.addEventListener('track', e => {
              // input audio from the spaces to the agent
              console.log('track added', e.streams.length, e.streams);
              for (const stream of e.streams) {
                const audioTracks = stream.getAudioTracks();
                if (audioTracks.length > 0) {
                  const id = crypto.randomUUID();
                  postUp('audioStart', {
                    id,
                  });

                  const audioNode = globalThis.globalAudioContext.createMediaStreamSource(stream);
                  console.log('got audio node', audioNode);
                  // create ws input worklet node
                  const destination = globalAudioContext.createMediaStreamDestination();
                  // create ws output worklet node
                  const wsInputProcessor = new AudioWorkletNode(globalAudioContext, 'ws-input-worklet');
                  // connect
                  audioNode.connect(wsInputProcessor);
                  wsInputProcessor.connect(destination);
                  // listen for messages
                  wsInputProcessor.port.onmessage = e => {
                    // console.log('wsInputProcessor data', e.data);
                    // post the message up
                    const f32 = e.data; // Float32Array
                    // convert to base64
                    const base64 = float32ToBase64(f32);
                    postUp('audio', { id, base64 });
                  };

                  const audioTrack = audioTracks[0];
                  audioTrack.addEventListener('ended', e => {
                    console.log('audio track ended', e);
                    postUp('audioEnd', { id });
                    audioNode.disconnect();
                  });
                }
              }
            });

            return original;
          }
          console.log('RTCPeerConnection override 2');
          // Replace the original RTCPeerConnection with the custom one
          window.RTCPeerConnection = CustomRTCPeerConnection;
          console.log('RTCPeerConnection override 3');

          // create the global audio context
          globalThis.globalAudioContext = new AudioContext();
          postUp('globalAudioContextInit', {
            sampleRate: globalAudioContext.sampleRate,
          });

          // ensure the worklets are loaded
          let workletsLoaded = false;
          const ensureWorkletsLoaded = async (audioContext) => {
            if (workletsLoaded) {
              return;
            }

            const wsInputText = `\
              const bufferSize = 4096;

              class WsInputWorklet extends AudioWorkletProcessor {
                constructor (...args) {
                  super(...args);

                  this.buffer = new Float32Array(bufferSize);
                  this.bufferIndex = 0;
                }

                process(inputs, outputs, parameters) {
                  const channels = inputs[0];
                  const firstChannel = channels[0];
                  // if (channels.length !== 1) {
                  //   console.warn('expected 1 channel', channels.length);
                  // }
                  if (firstChannel) {
                    for (let i = 0; i < firstChannel.length; i++) {
                      this.buffer[this.bufferIndex++] = firstChannel[i];
                      if (this.bufferIndex >= this.buffer.length) {
                        this.port.postMessage(this.buffer, [this.buffer.buffer]);
                        this.buffer = new Float32Array(bufferSize);
                        this.bufferIndex = 0;
                      }
                    }
                  }
                  return true;
                }
              }
              registerProcessor('ws-input-worklet', WsInputWorklet);
            `;
            const wsInputBlob = new Blob([wsInputText], { type: 'text/javascript' });
            const wsInputUrl = URL.createObjectURL(wsInputBlob);

            const wsOutputText = `\
              // const volumeUpdateRate = 20;
              const volumeUpdateRate = Infinity;
              const volumeScale = 2;
              // const audioBufferLength = 30;
              const audioBufferLength = Infinity;
              class WsOutputWorklet extends AudioWorkletProcessor {
                constructor (...args) {
                  super(...args);
                  
                  this.buffers = [];
                  this.lastVolumeTime = 0;
                  this.maxSample = 0;
                  this.numSamples = 0;
                  this.flushed = true;
                  
                  this.port.onmessage = e => {
                    this.buffers.push(e.data);

                    this.flushed = false;

                    // if the buffer is too big, delete it
                    // if (this.buffers.length > audioBufferLength) {
                    //   this.buffers.splice(0, this.buffers.length - audioBufferLength);
                    // }
                  };
                }

                process(inputs, outputs, parameters) {
                  const output = outputs[0];
                  // console.log('outputs', outputs.length);
                  let bufferIndex, frameIndex;
                  for (const frames of output) {
                    bufferIndex = 0;
                    frameIndex = 0;

                    if (bufferIndex < this.buffers.length) {
                      for (let i = 0; i < frames.length; i++) {
                        const buffer = this.buffers[bufferIndex];
                        if (frameIndex < buffer.length) {
                          // console.log('set frame', frames, buffer);
                          const v = buffer[frameIndex++];
                          frames[i] = v;
                          this.maxSample = Math.max(Math.abs(v), this.maxSample);
                          this.numSamples++;
                        } else {
                          bufferIndex++;
                          frameIndex = 0;
                          if (bufferIndex < this.buffers.length) {
                            i--;
                            continue;
                          } else {
                            break;
                          }
                        }
                      }
                    }
                  }
                  if (bufferIndex > 0) {
                    // console.log('finished buffer', bufferIndex);
                    this.buffers.splice(0, bufferIndex);
                  }
                  if (frameIndex > 0) {
                    this.buffers[0] = this.buffers[0].slice(frameIndex);
                    if (this.buffers[0].length === 0) {
                      this.buffers.shift();
                    }
                  }

                  // update flushed
                  if (!this.flushed && this.buffers.length === 0) {
                    this.flushed = true;
                    this.port.postMessage({
                      method: 'flush',
                    });
                  }

                  // update volume
                  if (isFinite(volumeUpdateRate)) {
                    const now = Date.now();
                    const timeDiff = now - this.lastVolumeTime;
                    if (timeDiff >= volumeUpdateRate) {
                      const volume = this.numSamples > 0 ?
                        Math.min(this.maxSample * volumeScale, 1)
                      :
                        0;
                      this.port.postMessage({
                        method: 'volume',
                        args: {
                          volume,
                        },
                      });

                      this.lastVolumeTime = now;
                      this.maxSample = 0;
                      this.numSamples = 0;
                    }
                  }
                  
                  return true;
                }
              }
              registerProcessor('ws-output-worklet', WsOutputWorklet);
            `;
            const wsOutputBlob = new Blob([wsOutputText], { type: 'text/javascript' });
            const wsOutputUrl = URL.createObjectURL(wsOutputBlob);

            await Promise.all([
              audioContext.audioWorklet.addModule(wsInputUrl),
              audioContext.audioWorklet.addModule(wsOutputUrl),
            ]);
            workletsLoaded = true;
          };

          // add audio input stream context
          globalThis.audioInputStream = null;
          globalThis.postDown = (eventType, args) => {
            // console.log('got post down', JSON.stringify({ eventType, args }, null, 2));
            switch (eventType) {
              // output audio from the agent to the spaces
              case 'audio': {
                if (globalThis.audioInputStream) {
                  const base64 = args;
                  const f32 = base64ToFloat32Array(base64);
                  globalThis.audioInputStream.write(f32);
                }
                break;
              }
            }
          };

          // intercept the navigator.mediaDevices methods
          if (window.navigator?.mediaDevices) {
            const createInputAudioStream = async () => {
              try {
                console.log('createFakeAudioStream 1');

                await ensureWorkletsLoaded(globalAudioContext);

                console.log('createFakeAudioStream 2', globalAudioContext.state);

                // Resume the audio context if it's suspended
                if (globalAudioContext.state === 'suspended') {
                  console.log('resume audiocontext 1');
                  await globalAudioContext.resume();
                  console.log('resume audiocontext 2');
                }

                console.log('createFakeAudioStream 3', globalAudioContext.state);

                const destination = globalAudioContext.createMediaStreamDestination();

                // create ws output worklet node
                const wsOutputProcessor = new AudioWorkletNode(globalAudioContext, 'ws-output-worklet');
                // connect the worklet node to the destination
                wsOutputProcessor.connect(destination);

                destination.stream.write = (f32) => {
                  wsOutputProcessor.port.postMessage(f32);
                };

                // return the destination stream
                console.log('returning destination stream', destination.stream);
                return destination.stream;
              } catch (err) {
                console.warn('createFakeAudioStream error', err);
                throw err;
              }
            };
            let audioInputStreamPromise = null;
            const ensureInputAudioStream = async () => {
              if (!audioInputStreamPromise) {
                audioInputStreamPromise = await createInputAudioStream();
                (async () => {
                  globalThis.audioInputStream = await audioInputStreamPromise;
                  postUp('audioInputStreamCreated');
                })();
              }
              return audioInputStreamPromise;
            };
            navigator.mediaDevices.enumerateDevices = async () => {
              return [
                {
                  deviceId: 'default',
                  groupId: 'default',
                  kind: 'audioinput',
                  label: 'Default Audio Device',
                },
              ];
            };
            navigator.mediaDevices.getUserMedia = async (constraints) => {
              console.log('get user media 1', JSON.stringify(constraints, null, 2));
              if (constraints.audio) {
                console.log('get user media 2', constraints);
                return await ensureInputAudioStream();
              }
              console.log('get user media 3', constraints);
              throw new Error('Only audio streams are supported in this override');
            };
            console.log('RTCPeerConnection override 4');
          }
        });
        if (await _checkAbort()) return;
        console.log('intercept 3');

        return {
          browser,
          context,
          page,
        };
      };
      const _pollForParticipants = async (page) => {
        // XXX hook this up to agents tracking
        for (;;) {
          try {
            let participantsEl = page.locator('[id="ParticipantsWrapper"]');
            await participantsEl.waitFor();
            console.log('found participants element');

            const participants = await participantsEl.locator('> div > div > div > div:nth-child(2) > div').all();
            const participantNamesPromise = participants.map(async participant => {
              const nameEl = participant.locator('> div > div:nth-child(2)');
              const text = await nameEl.textContent();
              return text;
            });
            const participantNames = await Promise.all(participantNamesPromise);
            console.log('got participants', participantNames);
          } catch (err) {
            console.warn('error polling participants', err);
          }
          await new Promise(accept => setTimeout(accept, 1000));
        }
      };
      const _createTs = async () => {
        // const browser = await chromium.launch({
        //   headless: false,
        //   devtools: true,
        //   // args: ['--disable-web-security'],
        // });
        const browser = await createBrowser(undefined, {
          jwt,
        });
        if (await _checkAbort(async () => {
          await browser.close();
        })) return;

        console.log('got browser');
        const {
          context,
          page,
        } = await _decorateBrowser(browser);
        if (await _checkAbort()) return;
        console.log('got context');

        // detech logout (bad token)
        page.on('framenavigated', frame => {
          if (frame === page.mainFrame()) {
            const url = frame.url();
            console.log('navigated to', url);
            if (/logout/i.test(url)) {
              console.log('logout detected, aborting -- you might need to update your twitter auth token');
              this.abortController.abort();
            }
          }
        });

        await page.goto('https://x.com/home');
        if (await _checkAbort()) return;
        console.log('got to page 1');

        const button = page.locator('button[aria-label="More menu items"]');
        console.log('got button html 1', await button.innerHTML());
        await button.click();
        if (await _checkAbort()) return;
        console.log('got button 2');

        // select this anchor
        const a = page.locator('a[href="/i/spaces/start"]');
        console.log('got a html 1', await a.innerHTML());
        await a.click();
        if (await _checkAbort()) return;
        console.log('got a html 2');

        // select by the button text
        // const submitTextEl = page.locator('text="Start now"');
        // console.log('got submit text el', submitTextEl);

        // Find the nearest parent <button> element
        //  const parentButton = submitTextEl.locator('closest', 'button');
        const parentButton = page.locator('button:has-text("Start now")');
        // console.log('got parent button el', parentButton);
        // print the html of the button
        console.log('button click 1', await parentButton.innerHTML());
        await parentButton.click();
        if (await _checkAbort()) return;
        console.log('button click 2');

        const unmuteButton = page.locator('button[aria-label="Unmute"]');
        console.log('got unmute button html 1', await unmuteButton.innerHTML({
          timeout: 60000,
        }));
        await unmuteButton.click();
        if (await _checkAbort()) return;
        console.log('got unmute button 2');

        // poll for participants
        // _pollForParticipants(page);

        // handle requests to speak
        (async () => {
          // XXX make the allowed speakers configurable via props
          for (;;) {
            try {
              const requestedEl = page.locator('text=/Requested/i');
              const parentButton = requestedEl.locator('closest', 'button');
              console.log('got requested button html 1', await parentButton.innerHTML());
              await parentButton.click({
                // timeout: 0, // no timeout
              });
              if (await _checkAbort()) return;

              const approveElements = page.locator('text=/Approve/i');
              const approveButton = approveElements.locator('closest', 'button');
              console.log('got approve button html 1', await approveButton.innerHTML());
              await approveButton.click();
              if (await _checkAbort()) return;

              const backButton = page.locator('button[aria-label="Back"]');
              console.log('got back button html 1', await backButton.innerHTML());
              await backButton.click();
              if (await _checkAbort()) return;
            } catch (err) {
              console.warn('error handling request to speak', err);
            }
          }
        })();
      };
      const _connectTs = async () => {
        if (!url) {
          throw new Error('url argument is required');
        }

        // const {
        //   // browser,
        //   // context,
        //   page,
        //   destroySession,
        // } = await _makeBrowser();

        const browser = await createBrowser(undefined, {
          jwt,
        });
        if (await _checkAbort(async () => {
          await browser.close();
        })) return;

        const {
          context,
          page,
        } = await _decorateBrowser(browser);
        if (await _checkAbort()) return;

        console.log('got browser');
        await page.goto(url);
        if (await _checkAbort()) return;

        if (/status/.test(url)) {
          const listenButton = page.locator('a[href^="/i/spaces/"][href$="/peek"]');
          console.log('got button html 1', await listenButton.innerHTML());
          await listenButton.click();
          if (await _checkAbort()) return;
          console.log('got button 2');
        }

        const startListeningButton = page.locator('button[aria-label="Start listening"]');
        console.log('got start listening button html 1', await startListeningButton.innerHTML());
        await startListeningButton.click();
        if (await _checkAbort()) return;
        console.log('got start listening button 2');

        const requestToSpeakButton = page.locator('button[aria-label="Request to speak"]');
        console.log('got request to speak button html 1', await requestToSpeakButton.innerHTML());
        await requestToSpeakButton.click();
        if (await _checkAbort()) return;
        console.log('got request to speak button 2');

        const unmuteButton = page.locator('button[aria-label="Unmute"]');
        console.log('got unmute button html 1', await unmuteButton.innerHTML({
          timeout: 60000,
        }));
        await unmuteButton.click();
        if (await _checkAbort()) return;
        console.log('got unmute button 2');

        // poll for participants
        // _pollForParticipants(page);
      };

      switch (subcommand) {
        case 'create': {
          await _createTs();
          break;
        }
        case 'connect': {
          await _connectTs();
          break;
        }
        default: {
          throw new Error(`unknown subcommand: ${subcommand}`);
        }
      }
    };
    
    (async () => {
      await _start();
    })().catch(err => {
      console.warn('twitter spaces bot error', err);
    });
  }

  destroy() {
    this.abortController.abort();
    this.abortController = new AbortController();
  }
}
export class TwitterSpacesManager extends EventTarget {
  codecs: any;
  constructor({
    codecs,
  }) {
    super();

    this.codecs = codecs;
  }
  async addTwitterSpacesBot(args: TwitterSpacesArgs) {
    const twitterSpacesBot = new TwitterSpacesBot(args);
    return twitterSpacesBot;
  }
  removeTwitterSpacesBot(twitterSpacesBot: TwitterSpacesBot) {
    twitterSpacesBot.destroy();
  }
  live() {
    // nothing
  }
  destroy() {
    // nothing
  }
}