import {
  zbencode,
  zbdecode,
} from 'zjs/encoding.mjs';
import {
  QueueManager,
} from 'queue-manager';
import {
  transcribe,
} from '../../util/audio-perception.mjs';
import {
  createOpusDecodeTransformStream,
  createMp3ReadableStreamSource,
} from 'codecs/audio-client.mjs';
import {
  makePromise,
  makeId,
} from '../../util/util.mjs';
import {
  discordBotEndpointUrl,
} from '../../util/endpoints.mjs';
import {
  floatTo16Bit,
} from 'codecs/convert.mjs';
import { mulaw } from '../alawmulaw/dist/alawmulaw.mjs';
import { AudioChunker } from '../../util/audio-chunker.mjs';
import { resample } from '../../../codecs/resample.mjs';


//

export class DiscordInput {
  constructor({
    ws = null,
  } = {}) {
    this.ws = ws;

    this.streamSpecs = new Map();
  }

  setWs(ws) {
    this.ws = ws;
  }

  writeText(text, {
    channelId,
    userId,
  } = {}) {
    const m = {
      method: 'writeText',
      args: {
        text,
        channelId,
        userId,
      },
    };
    // console.log('send message', m);
    const s = JSON.stringify(m);
    this.ws.send(s);
  }

  // async to wait for consumption of the stream by the discord api
  async pushStream(stream) {
    const streamId = makeId(8);

    const startVoiceMessage = {
      method: 'playVoiceStart',
      args: {
        streamId,
      },
    };
    // console.log('start voice message', {
    //   startVoiceMessage,
    // });
    this.ws.send(JSON.stringify(startVoiceMessage));

    const abortController = new AbortController();
    const {signal} = abortController;
    // const onabort = () => {
    //   const voiceAbortMessage = {
    //     method: 'playVoiceEnd',
    //     args: {
    //       streamId,
    //     },
    //   };
    //   this.ws.send(JSON.stringify(voiceAbortMessage));
    // };
    // signal.addEventListener('abort', onabort);
    // const cleanup = () => {
    //   signal.removeEventListener('abort', onabort);
    // };

    this.streamSpecs.set(streamId, {
      // stream,
      cancel() {
        abortController.abort();
      },
    });

    // signal.addEventListener('abort', () => {
    //   const voiceAbortMessage = {
    //     method: 'playVoiceAbort',
    //     args: {
    //       streamId,
    //     },
    //   };
    //   // console.log('play voice stream send abort', voiceAbortMessage);
    //   this.ws.send(JSON.stringify(voiceAbortMessage));
    // });

    const reader = stream.getReader();
    for (;;) {
      const {
        done,
        value,
      // } = await abortableRead(reader, signal);
      } = await reader.read();
      if (!done && !signal.aborted) {
        // console.log('signal read not done', !!signal.aborted);
        const uint8Array = value;
        const voiceDataMessage = {
          method: 'playVoiceData',
          args: {
            streamId,
            uint8Array,
          },
        };
        const encodedData = zbencode(voiceDataMessage);
        // console.log('play voice stream send data', voiceDataMessage, encodedData);
        // ensure the websocket is still live
        if (this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(encodedData);
        } else {
          break;
        }
      } else {
        // console.log('signal read done', !!signal.aborted);
        const voiceEndMessage = {
          method: 'playVoiceEnd',
          args: {
            streamId,
          },
        };
        // console.log('play voice stream send end', voiceEndMessage);
        this.ws.send(JSON.stringify(voiceEndMessage));
        break;
      }
    }

    // cleanup();

    this.streamSpecs.delete(streamId);
  }
  cancelStream(args) {
    const {
      streamId,
    } = args;
    const streamSpec = this.streamSpecs.get(streamId);
    if (streamSpec) {
      streamSpec.cancel();
    } else {
      console.warn('no stream found for streamId: ' + streamId);
    }
  }

  sendTyping({
    channelId,
    userId,
  } = {}) {
    const m = {
      method: 'sendTyping',
      args: {
        channelId,
        userId,
      },
    };
    const s = JSON.stringify(m);
    this.ws.send(s);
  }

  destroy() {
    // nothing
  }
}

//

export class DiscordOutputStream extends EventTarget {
  constructor({
    sampleRate,
    // speechQueue,
    codecs,
    jwt,
  }) {
    super();

    this.sampleRate = sampleRate;
    // this.speechQueue = speechQueue;
    this.codecs = codecs;
    this.jwt = jwt;

    this.opusTransformStream = createOpusDecodeTransformStream({
      sampleRate,
      codecs,
    });
    this.opusTransformStreamWriter = this.opusTransformStream.writable.getWriter();

    this.mp3Source = createMp3ReadableStreamSource({
      readableStream: this.opusTransformStream.readable,
      codecs,
    });
    this.mp3BuffersOutputPromise = this.mp3Source.output.readAll();
  }

  update(uint8Array) {
    this.opusTransformStreamWriter.write(uint8Array);
  }

  async end() {
    const {
      jwt,
    } = this;

    this.opusTransformStreamWriter.close();

    const mp3Buffers = await this.mp3BuffersOutputPromise;
    const mp3Blob = new Blob(mp3Buffers, {
      type: 'audio/mpeg',
    });


    const text = await transcribe(mp3Blob, {
      jwt,
    });
    this.dispatchEvent(new MessageEvent('speech', {
      data: text,
    }));
  }

  destroy() {
    (async () => {
      await this.waitForLoad();

      this.decoder.free();
    })();
  }
}

//

export class DiscordOutput extends EventTarget {
  sampleRate;
  codecs;
  constructor({
    sampleRate = 48000,
    codecs,
    jwt,
  } = {}) {
    super();

    if (!codecs) {
      throw new Error('DiscordOutput: no codecs provided');
    }

    this.sampleRate = sampleRate;
    this.codecs = codecs;
    this.jwt = jwt;

    // this.speechQueue = new QueueManager();
    this.streams = new Map();
  }

  pushText(args) {
    // const {
    //   userId,
    //   username,
    //   text,
    //   channelId,
    // } = args;
    this.dispatchEvent(new MessageEvent('text', {
      data: args,
    }));
  }

  pushStreamStart(args) {
    const {
      codecs,
      jwt,
    } = this;
    if (!codecs) {
      throw new Error('pushStreamStart: no codecs provided');
    }
    if (!jwt) {
      throw new Error('pushStreamStart: no jwt provided');
    }

    const {
      userId,
      username,
      channelId,
      streamId,
    } = args;
    console.log('push stream start', args);
    let stream = this.streams.get(streamId);
    if (!stream) {
      const {
        sampleRate,
        // speechQueue,
      } = this;

      stream = new DiscordOutputStream({
        sampleRate,
        // speechQueue,
        codecs,
        jwt,
      });
      stream.addEventListener('speech', e => {
        const text = e.data;

        this.dispatchEvent(new MessageEvent('text', {
          data: {
            userId,
            username,
            text,
            channelId,
          },
        }));
      });
      this.streams.set(streamId, stream);
    } else {
      throw new Error('stream already exists for streamId: ' + streamId);
    }
  }

  pushStreamEnd(args) {
    const {
      userId,
      streamId,
    } = args;
    const stream = this.streams.get(streamId);
    if (stream) {
      stream.end();
      this.streams.delete(streamId);
    } else {
      throw new Error('pushStreamEnd: no stream found for streamId: ' + streamId);
    }
  }

  pushStreamUpdate(streamId, uint8Array) {
    const stream = this.streams.get(streamId);
    if (stream) {
      stream.update(uint8Array);
    } else {
      throw new Error('pushStreamUpdate: no stream found for streamId: ' + streamId);
    }
  }

  destroy() {
    for (const stream of this.streams.values()) {
      stream.destroy();
    }
  }
}

//

export class DiscordBotClient extends EventTarget {
  token;
  codecs;
  ws = null;
  input = null; // going from the agent into the discord bot
  output = null; // coming out of the discord bot to the agent
  constructor({
    token,
    codecs,
    jwt,
  }) {
    super();

    if (!codecs) {
      throw new Error('DiscordBotClient: no codecs provided');
    }
    if (!jwt) {
      throw new Error('DiscordBotClient: no jwt provided');
    }

    this.token = token;
    this.codecs = codecs;
    this.jwt = jwt;
    this.input = new DiscordInput();
    this.output = new DiscordOutput({
      codecs,
      jwt,
    });

    // Create reusable decoder
    this.initializeDecoder();
    
    // Initialize VAD
    this.#initializeVAD();

    this.audioChunker = new AudioChunker({
      sampleRate: 16000, // TranscribedVoiceInput.transcribeSampleRate
      chunkSize: 1536,
    });

    // Add queue manager for opus conversion
    this.conversionQueue = new QueueManager();
  }

  #activeVoiceBuffer = {
    data: [],
    userInfo: null,
    timer: null,
    collecting: false,
  };
  #VOICE_IDLE_TIMEOUT = 1000;

  async #initializeVAD() {
    try {
      const u = new URL(`https://vad.fly.dev/`.replace(/^http/, 'ws'));
      u.searchParams.set('apiKey', this.jwt);
      const ws = new WebSocket(u);
      ws.binaryType = 'arraybuffer';

      ws.addEventListener('open', () => {
        console.log('VAD connection established');
      });

      ws.addEventListener('message', async (e) => {
        const message = JSON.parse(e.data);
        console.log('VAD message', message);
        const { type } = message;
        
        switch (type) {
          case 'speechstart': {
            console.log('speech start detected');
            // Start collecting voice data
            this.#activeVoiceBuffer.collecting = true;
            break;
          }
          case 'speechend': {
            console.log('speech end detected');
            // Process collected voice data
            this.#processVoiceBuffer();
            this.#activeVoiceBuffer.collecting = false;
            break;
          }
          case 'speechcancel': {
            console.log('speech detection cancelled');
            // this.#activeVoiceBuffer.collecting = false;
            // this.#clearBuffer();
            break;
          }
        }
      });

      this.vadConnection = ws;
    } catch (err) {
      console.error('Failed to initialize VAD:', err);
    }
  }

  #clearBuffer() {
    const buffer = this.#activeVoiceBuffer;
    buffer.data = [];
    buffer.userInfo = null;
    buffer.collecting = false;
    if (buffer.timer) {
      clearTimeout(buffer.timer);
      buffer.timer = null;
    }
  }

  async initializeDecoder() {
    try {
      this.decoder = createOpusDecodeTransformStream({
        sampleRate: 48000,
        codecs: this.codecs,
      });
      console.log('Opus decoder initialized');
    } catch (err) {
      console.error('Failed to initialize decoder:', err);
      this.decoder = null;
    }
  }

  async #convertOpusToPCM(opusData) {
    return await this.conversionQueue.waitForTurn(async () => {
      try {
        if (!this.decoder) {
          await this.initializeDecoder();
        }
        
        const writer = this.decoder.writable.getWriter();
        const reader = this.decoder.readable.getReader();
        
        try {
          // Start reading first
          const readPromise = reader.read();
          
          // Then write the data
          await writer.write(opusData);
          
          // Wait for the read to complete
          const { value } = await readPromise;
          
          if (!value) {
            return new Float32Array(0);
          }
          
          // Resample the PCM data to 16kHz for VAD
          return resample(value, 48000, 16000);
        } finally {
          // Always release the locks
          writer.releaseLock();
          reader.releaseLock();
        }
      } catch (err) {
        console.error('Error in convertOpusToPCM:', err);
        // If we hit an error, null out the decoder so we can try to recreate it
        this.decoder = null;
        return new Float32Array(0);
      }
    });
  }

  #bufferVoiceData(newData) {
    if (!this.#activeVoiceBuffer.userInfo) {
      console.warn('Received voice data before stream start');
      return;
    }

    // First, buffer the data regardless of VAD state
    this.#activeVoiceBuffer.data.push(newData);
    
    // Always reset/start the processing timer
    if (this.#activeVoiceBuffer.timer) {
      clearTimeout(this.#activeVoiceBuffer.timer);
    }

    this.#activeVoiceBuffer.timer = setTimeout(() => {
      console.log('Voice idle timeout reached, processing buffer, collecting:', this.#activeVoiceBuffer.collecting,
        'data length:', this.#activeVoiceBuffer.data.length,
      );
      if (this.#activeVoiceBuffer.collecting) {
        // If we were collecting speech, process what we have
        this.#processVoiceBuffer();
        this.#activeVoiceBuffer.collecting = false;
      } else {
        // If no speech was detected, clear the buffer without processing
        this.#clearBuffer();
      }
    }, this.#VOICE_IDLE_TIMEOUT);

    // Convert and send to VAD asynchronously
    this.#convertOpusToPCM(newData).then(pcmData => {
      if (this.vadConnection?.readyState === WebSocket.OPEN) {
        // Chunk the PCM data like the microphone implementation
        const frames = this.audioChunker.write(pcmData);
        
        // Send each frame to VAD
        for (const frame of frames) {
          const i16 = floatTo16Bit(frame);
          const mulawBuffer = mulaw.encode(i16);
          console.log('Sending VAD frame:', {
            frameLength: frame.length,
            mulawLength: mulawBuffer.length
          });
          this.vadConnection.send(mulawBuffer);
        }
      }
    }).catch(err => {
      console.error('Error processing voice data:', err);
    });
  }

  #processVoiceBuffer() {
    const buffer = this.#activeVoiceBuffer;
    
    console.log('processing voice buffer', buffer.data.length, buffer.userInfo);
    if (buffer.data.length > 0 && buffer.userInfo) {
      try {
        for (const packet of buffer.data) {
          this.output.pushStreamUpdate(buffer.userInfo.streamId, packet);
        }
        
        this.output.pushStreamEnd(buffer.userInfo);
      } catch (err) {
        console.error('Error processing voice buffer:', err);
      }

      buffer.data = [];
      // Don't clear userInfo here as we might get more voice data
      // buffer.userInfo = null;
    }

    if (buffer.timer) {
      clearTimeout(buffer.timer);
      buffer.timer = null;
    }
  }

  async status() {
    const res = await fetch(`${discordBotEndpointUrl}/status`, {
      headers: {
        'Authorization': `Bearer ${this.token}`,
      },
    });
    const j = await res.json();
    return j;
  }
  async connect({
    channels = [],
    dms = [],
    userWhitelist = [],
  }) {
    const channelSpecs = channels.map((channel) => {
      if (typeof channel === 'string') {
        return channel;
      } else if (channel instanceof RegExp) {
        return channel.source;
      } else {
        throw new Error('invalid channel type: ' + JSON.stringify(channel));
      }
    });
    const u = (() => {
      const u = new URL(discordBotEndpointUrl.replace(/^http/, 'ws'));
      u.searchParams.set('token', this.token);
      u.searchParams.set('channels', JSON.stringify(channelSpecs));
      u.searchParams.set('dms', JSON.stringify(dms));
      u.searchParams.set('userWhitelist', JSON.stringify(userWhitelist));
      return u;
    })();
    const ws = new WebSocket(u);
    ws.binaryType = 'arraybuffer';
    const connectPromise = makePromise();
    const readyPromise = makePromise();
    ws.onopen = () => {
      // console.log('opened');
      connectPromise.resolve();
    };
    ws.onclose = () => {
      console.warn('discord client closed');
    };
    ws.onmessage = e => {
      // console.log('got message', e.data);

      if (e.data instanceof ArrayBuffer) {
        const arrayBuffer = e.data;
        const uint8Array = new Uint8Array(arrayBuffer);
        const o = zbdecode(uint8Array);
        // console.log('got binary message', o);
        const {
          method,
          args,
        } = o;
        switch (method) {
          case 'voicedata': {
            // Only process voice data if we have user info
            if (this.#activeVoiceBuffer.userInfo) {
              const {uint8Array} = args;
              this.#bufferVoiceData(uint8Array);
            }
            break;
          }
          default: {
            console.warn('unhandled binary method', method);
            break;
          }
        }
      } else {
        const j = JSON.parse(e.data);
        const {
          method,
          args,
        } = j;
        switch (method) {
          case 'ready': {
            readyPromise.resolve();
            break;
          }
          case 'channelconnect': {
            this.dispatchEvent(new MessageEvent('channelconnect', {
              data: args,
            }));
            break;
          }
          case 'dmconnect': {
            this.dispatchEvent(new MessageEvent('dmconnect', {
              data: args,
            }));
            break;
          }
          case 'guildmemberadd': {
            this.dispatchEvent(new MessageEvent('guildmemberadd', {
              data: args,
            }));
            break;
          }
          case 'guildmemberremove': {
            this.dispatchEvent(new MessageEvent('guildmemberremove', {
              data: args,
            }));
            break;
          }
          case 'text': {
            console.log('text message', args);
            this.output.pushText(args);
            break;
          }
          case 'voicestart': {
            console.log('voice start', args);
            // Set up user info BEFORE processing any voice data
            this.#activeVoiceBuffer.userInfo = {
              userId: args.userId,
              username: args.username,
              channelId: args.channelId,
              streamId: this.#generateStreamId()
            };
            this.output.pushStreamStart(this.#activeVoiceBuffer.userInfo);
            break;
          }
          case 'voiceend': {
            console.log('voice end', args);
            // Don't clear user info here, let VAD handle it
            break;
          }
          case 'voiceidle': {
            console.log('voice idle', args);
            // Only process if VAD isn't collecting
            if (!this.#activeVoiceBuffer.collecting) {
              this.#processVoiceBuffer();
            }
            this.input.cancelStream(args);
            break;
          }
          default: {
            console.warn('unhandled json method', method);
            break;
          }
        }
      }
    };
    ws.onerror = err => {
      console.warn(err);
      connectPromise.reject(err);
    };
    this.ws = ws;
    this.input.setWs(ws);

    await connectPromise;
    await readyPromise;
  }

  #generateStreamId() {
    return Math.random().toString(36).substring(2, 10);
  }

  destroy() {
    if (this.#activeVoiceBuffer.timer) {
      clearTimeout(this.#activeVoiceBuffer.timer);
    }
    
    if (this.vadConnection) {
      this.vadConnection.close();
    }

    // Clean up the decoder
    if (this.decoder) {
      this.decoder.readable.cancel();
      this.decoder.writable.abort();
      this.decoder = null;
    }

    this.#activeVoiceBuffer = null;
    
    this.ws && this.ws.close();
    this.input.destroy();
    this.output.destroy();
  }
}