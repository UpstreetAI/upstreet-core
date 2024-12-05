import { mulaw } from '../lib/alawmulaw/dist/alawmulaw.mjs';
import {
  floatTo16Bit,
  // int16ToFloat32,
} from 'codecs/convert.mjs';
import { AudioEncodeStream } from 'codecs/audio-encode.mjs';
import { QueueManager } from 'queue-manager';
import {
  aiHost,
  realtimeSTTHost,
  realtimeSTTControlPort,
  realtimeSTTDataPort,
} from './endpoints.mjs';

const defaultTranscriptionModel = 'whisper-1';
// const defaultRealtimeModel = 'gpt-4o-realtime-preview-2024-10-01';
const vadEndpoint = `https://vad.fly.dev/`;

const mergeUint8Arrays = (arrays) => {
  let totalLength = 0;
  for (const array of arrays) {
    totalLength += array.length;
  }
  const result = new Uint8Array(totalLength);
  let index = 0;
  for (const array of arrays) {
    result.set(array, index);
    index += array.length;
  }
  return result;
};

const encodeMp3 = async (f32, {
  sampleRate,
  codecs,
}) => {
  if (!sampleRate) {
    throw new Error('no sample rate');
  }
  if (!codecs) {
    throw new Error('no codecs');
  }

  // console.log('encoding 1');
  try {
    const encodeTransformStream = new AudioEncodeStream({
      type: 'audio/mpeg',
      sampleRate,
      codecs,
    });
    // console.log('encoding 2');

    (async () => {
      const writer = encodeTransformStream.writable.getWriter();
      // console.log('write 1');
      await writer.write(f32);
      // console.log('write 2');
      await writer.close();
      // console.log('write 3');
    })();

    // read the encoded mp3 from the readable end of the web stream
    const reader = encodeTransformStream.readable.getReader();
    const chunks = [];
    for (;;) {
      // console.log('read 1');
      const { done, value } = await reader.read();
      // console.log('read 2', {
      //   done,
      //   value,
      // });
      if (done) {
        break;
      }
      chunks.push(value);
    }
    // console.log('read 3');

    // console.log('got chunks 1', chunks);
    const uint8Array = mergeUint8Arrays(chunks);
    // console.log('got chunks 2', uint8Array);
    return uint8Array;
  } catch (error) {
    console.warn('error encoding mp3', error);
    throw error;
  }
};

export const transcribe = async (data, {
  jwt,
}) => {
  const fd = new FormData();
  fd.append('file', new Blob([data], {
    type: 'audio/mpeg',
  }));
  fd.append('model', defaultTranscriptionModel);
  fd.append('language', 'en');
  // fd.append('response_format', 'json');
  
  const res = await fetch(`${aiHost}/api/ai/audio/transcriptions`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${jwt}`,
    },
    body: fd,
  });
  if (res.ok) {
    const j = await res.json();
    const { text } = j;
    return text;
  } else {
    const text = await res.text();
    throw new Error('request failed: ' + res.status + ': ' + text);
  }
};

export const transcribeRealtime = ({
  sampleRate,
  codecs,
  jwt,
}) => {
  if (!codecs) {
    throw new Error('no codecs');
  }
  if (!jwt) {
    throw new Error('no jwt');
  }

  try {
    let bsSampleIndex = 0;
    const bs = [];
    let speechStartSampleIndex = 0;
    const queueManager = new QueueManager();
    const vadOptions = {
      // Confidence threshold to classify a frame as speech (0-1). Higher = stricter, fewer false positives
      positiveSpeechThreshold: 0.7,
      // Confidence threshold to classify a frame as non-speech (0-1). Higher = stricter, fewer false negatives
      negativeSpeechThreshold: 0.6,
      // Number of frames to include before speech is detected
      preSpeechPadFrames: 1,
      // Number of consecutive non-speech frames before triggering speech end
      redemptionFrames: 5,
      // Minimum frames needed for speech detection - fewer frames trigger onVADMisfire instead of onSpeechEnd
      minSpeechFrames: 8,
      // Whether to submit speech segments when a pause is detected
      submitUserSpeechOnPause: false,
    };
    // console.log('connect transcribe realtime 1');

    // const u = new URL(`${aiHost.replace(/^http/, 'ws')}/api/ai/realtime`);
    // u.searchParams.set('model', defaultRealtimeModel);
    const u = new URL(vadEndpoint.replace(/^http/, 'ws'));
    u.searchParams.set('apiKey', jwt);
    u.searchParams.set('vadOptions', JSON.stringify(vadOptions));
    
    const ws = new WebSocket(u);
    // console.log('connect transcribe realtime 2');
    ws.binaryType = 'arraybuffer';
    // console.log('connect transcribe realtime 3');
    
    ws.addEventListener('open', () => {
      // console.log('transcribe ws open');
      transcription.dispatchEvent(new MessageEvent('open', {
        data: null,
      }));

      /* // configure the session
      const sessionConfig = {
        // "event_id": "event_123",
        "type": "session.update",
        "session": {
          // modalities: ['text', 'audio'],
          modalities: ['text'],
          // modalities: [],
          instructions: 'Repeat exactly what you hear.',
          // voice: 'alloy',
          input_audio_format: 'pcm16',
          // output_audio_format: 'pcm16',
          input_audio_transcription: {
            // enabled: true,
            model: 'whisper-1',
          },
          turn_detection: {
            type: 'server_vad',
            // threshold: 0.5,
            // prefix_padding_ms: 300,
            // silence_duration_ms: 200,
          },
          // tools: [],
          // tool_choice: 'auto',
          // temperature: 0.8,
          // max_response_output_tokens: 4096,
          max_response_output_tokens: 1,
        },
      };
      ws.send(JSON.stringify(sessionConfig)); */
    });
    ws.addEventListener('message', async (e) => {
      // console.log('transcribe message', e.data);
      const message = JSON.parse(e.data);
      const { type, sampleIndex } = message;
      switch (type) {
        case 'speechstart': {
          // console.log('speech start');
          speechStartSampleIndex = sampleIndex;

          transcription.dispatchEvent(new MessageEvent('speechstart', {
            data: null,
          }));

          break;
        }
        case 'speechstop': {
          transcription.dispatchEvent(new MessageEvent('speechstop', {
            data: null,
          }));

          const speechEndSampleIndex = sampleIndex;
          const numSpeechSamples = speechEndSampleIndex - speechStartSampleIndex;
          const f32Result = (() => {
            const f32Result = new Float32Array(numSpeechSamples);
            // copy the samples from the bs
            let f32ResultIndex = 0;
            for (;;) {
              const b = bs.shift(); // b is a Float32Array
              if (b) {
                bsSampleIndex += b.length;
                // copy the samples from b into f32Result
                f32Result.set(b, f32ResultIndex);
                f32ResultIndex += b.length;
                if (f32ResultIndex >= numSpeechSamples) {
                  break;
                }
              } else {
                break;
              }
            }
            return f32Result;
          })();
          // console.log('speech stop', f32Result);

          // encode as mp3 so we can transcribe it
          const mp3Buffer = await encodeMp3(f32Result, {
            sampleRate,
            codecs,
          });
          // console.log('encoded', mp3Buffer);

          await queueManager.waitForTurn(async () => {
            // console.log('transcribe 1', mp3Buffer);
            const text = await transcribe(mp3Buffer, {
              jwt,
            });
            // console.log('transcribed', text);

            transcription.dispatchEvent(new MessageEvent('transcription', {
              data: {
                transcript: text,
              },
            }));
          });

          break;
        }
        case 'speechcancel': {
          console.log('speech cancel');

          transcription.dispatchEvent(new MessageEvent('speechcancel', {
            data: null,
          }));

          break;
        }
        case 'trim': {
          // console.log('trim', sampleIndex);
          while (bsSampleIndex < sampleIndex) {
            const b = bs.shift();
            bsSampleIndex += b.length;
          }
          break;
        }
        /* case 'error': {
          break;
        }
        case 'session.created': {
          break;
        }
        case 'session.updated': {
          break;
        }
        case 'input_audio_buffer.committed': {
          break;
        }
        case 'input_audio_buffer.cleared': {
          break;
        }
        case 'input_audio_buffer.speech_started': {
          const timestamp = message.audio_start_ms;
          transcription.dispatchEvent(new MessageEvent('speechstart', {
            data: {
              timestamp,
            },
          }));
          break;
        }
        case 'input_audio_buffer.speech_stopped': {
          const timestamp = message.audio_end_ms;
          transcription.dispatchEvent(new MessageEvent('speechstop', {
            data: {
              timestamp,
            },
          }));
          transcription.clear();
          break;
        }
        case 'conversation.item.input_audio_transcription.completed': {
          const {
            transcript,
          } = message;
          if (transcript) {
            transcription.dispatchEvent(new MessageEvent('transcription', {
              data: {
                transcript,
              },
            }));
          }
          break;
        }
        case 'conversation.item.input_audio_transcription.failed': {
          console.log('transcription failed', message);
          break;
        }
        case 'response.audio_transcript.delta': {
          break;
        }
        case 'response.audio_transcript.done': {
          break;
        }
        // case 'response.text.delta': {
        //   break;
        // } */
      }
    });
    ws.addEventListener('error', (e) => {
      console.log('transcribe ws error', e);
      // transcription.dispatchEvent(new MessageEvent('error', {
      //   data: null,
      // }));
    });
    ws.addEventListener('close', (e) => {
      // console.log('transcribe ws close');
      transcription.dispatchEvent(new MessageEvent('close', {
        data: null,
      }));
    });

    const transcription = new EventTarget();
    transcription.write = async (f32) => { // Float32Array
      // console.log('transcription write', f32);

      bs.push(f32);

      const i16 = floatTo16Bit(f32);
      const mulawBuffer = mulaw.encode(i16);
      ws.send(mulawBuffer);

      // const base64 = Buffer.from(data).toString('base64');
      // const m = {
      //   type: 'input_audio_buffer.append',
      //   audio: base64,
      // };
      // ws.send(JSON.stringify(m));
    };
    // transcription.commit = async () => {
    //   const m = {
    //     type: 'input_audio_buffer.commit',
    //   };
    //   ws.send(JSON.stringify(m));
    // };
    // transcription.clear = async () => {
    //   const m = {
    //     type: 'input_audio_buffer.clear',
    //   };
    //   ws.send(JSON.stringify(m));
    // };
    transcription.close = () => {
      ws.close();
    };
    return transcription;
  } catch (error) {
    console.warn('error creating transcription', error);
    throw error;
  }
};

export const transcribeRealtimeSTT = async ({ sampleRate }) => {
  if (!sampleRate) {
    throw new Error('no sample rate');
  }

  try {
    // const controlUrl = `ws://${serverConfig.host}:${serverConfig.controlPort}`;
    // const dataUrl = `ws://${serverConfig.host}:${serverConfig.dataPort}`;

    const controlUrl = `wss://${realtimeSTTHost}-${realtimeSTTControlPort}.proxy.runpod.net`;
    const dataUrl = `wss://${realtimeSTTHost}-${realtimeSTTDataPort}.proxy.runpod.net`;


    const controlSocket = new WebSocket(controlUrl);
    const dataSocket = new WebSocket(dataUrl);

    const transcription = new EventTarget();

    controlSocket.addEventListener('open', () => {
      console.log('Control socket connected');
      const configs = [
        {
          command: "set_parameter",
          parameter: "language",
          value: "en"
        },
      ];
      configs.forEach(config => {
        controlSocket.send(JSON.stringify(config));
        console.log(`Configured ${config.parameter}: ${config.value}`);
      });
      transcription.dispatchEvent(new MessageEvent('open', { data: null }));
    });

    controlSocket.addEventListener('message', (data) => {
      console.log('Control message:', data);
    });

    dataSocket.addEventListener('open', () => {
      console.log('Data socket connected');
    });

    dataSocket.addEventListener('message', (data) => {
      try {
        const result = JSON.parse(data.data);
        if (result.type === 'realtime') {
          transcription.dispatchEvent(new MessageEvent('partial', {
            data: {
              transcript: result.text,
            },
          }));
        } else if (result.type === 'fullSentence') {
          transcription.dispatchEvent(new MessageEvent('transcription', {
            data: {
              transcript: result.text,
            },
          }));
        }
      } catch (err) {
        console.log('Raw message:', data.data);
      }
    });

    controlSocket.addEventListener('error', (e) => {
      console.warn('Control socket error:', e);
      transcription.dispatchEvent(new MessageEvent('error', { data: e }));
    });

    dataSocket.addEventListener('error', (e) => {
      console.warn('Data socket error:', e);
      transcription.dispatchEvent(new MessageEvent('error', { data: e }));
    });

    transcription.write = (f32) => {
      const i16 = floatTo16Bit(f32);
      const metadata = {
        sampleRate: sampleRate,
        channels: 1,
        encoding: 'PCM16'
      };
      const metadataStr = JSON.stringify(metadata);
      const metadataLength = Buffer.alloc(4);
      metadataLength.writeUInt32LE(metadataStr.length);

      const message = Buffer.concat([
        metadataLength,
        Buffer.from(metadataStr),
        Buffer.from(i16.buffer)
      ]);

      if (dataSocket.readyState === WebSocket.OPEN) {
        dataSocket.send(message);
      }
    };

    transcription.close = () => {
      if (controlSocket.readyState === WebSocket.OPEN) {
        controlSocket.close();
      }
      if (dataSocket.readyState === WebSocket.OPEN) {
        dataSocket.close();
      }
    };

    return transcription;
  } catch (error) {
    console.warn('error creating STT transcription:', error);
    throw error;
  }
};