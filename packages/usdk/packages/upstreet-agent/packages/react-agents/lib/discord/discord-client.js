import {
  zbencode,
  zbdecode,
} from 'zjs/encoding.mjs';
// import {
//   transcribe,
// } from '../../util/audio-perception.mjs';
import {
  createOpusDecodeTransformStream,
  // createMp3ReadableStreamSource,
} from 'codecs/audio-client.mjs';
import {
  AudioMerger,
} from '../../util/audio-merger.mjs';
import {
  makePromise,
  makeId,
} from '../../util/util.mjs';
import {
  discordBotEndpointUrl,
} from '../../util/endpoints.mjs';
import {
  TranscribedVoiceInput,
} from '../../devices/audio-transcriber.mjs';

//

// input from the agent to the discord bot
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

// output from discord bot to the agent
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

    this.streams = new Map(); // streamId -> { stream, writer }
    this.userStreams = new Map(); // userId -> AudioMerger
  }

  pushText(args) {
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
    const {
      sampleRate,
    } = this;

    let userStream = this.userStreams.get(userId);
    if (!userStream) {
      userStream = new AudioMerger({
        sampleRate,
        timeoutMs: 2000,
      });
      userStream.on('end', e => {
        this.userStreams.delete(userId);
      });

      const transcribedVoiceInput = new TranscribedVoiceInput({
        audioInput: userStream,
        sampleRate,
        codecs,
        jwt,
      });

      transcribedVoiceInput.addEventListener('transcription', e => {
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

      this.userStreams.set(userId, userStream);
    }

    let stream = this.streams.get(streamId);
    if (!stream) {
      const opusTransformStream = createOpusDecodeTransformStream({
        sampleRate,
        codecs,
      });
      const opusTransformStreamWriter = opusTransformStream.writable.getWriter();

      userStream.add(opusTransformStream.readable);

      const stream = {
        transformStream: opusTransformStream,
        writer: opusTransformStreamWriter,
      };
      this.streams.set(streamId, stream);
    }
  }

  pushStreamEnd(args) {
    const {
      userId,
      streamId,
    } = args;
    const stream = this.streams.get(streamId);
    if (stream) {
      const {
        writer,
      } = stream;
      writer.close();
      
      this.streams.delete(streamId);
    } else {
      throw new Error('pushStreamEnd: no stream found for streamId: ' + streamId);
    }
  }

  pushStreamUpdate(streamId, uint8Array) {
    const stream = this.streams.get(streamId);
    if (stream) {
      const {
        writer,
      } = stream;
      writer.write(uint8Array);
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
    maxReconnectAttempts = 10,
    reconnectDelay = 2000,
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
    this.input = new DiscordInput();
    this.output = new DiscordOutput({
      codecs,
      jwt,
    });

    this.maxReconnectAttempts = maxReconnectAttempts;
    this.reconnectDelay = reconnectDelay;
    this.reconnectAttempts = 0;
    this.isReconnecting = false;
  }
  async status() {
    return await delayedRetry(async () => {
      const res = await fetch(`${discordBotEndpointUrl}/status`, {
        headers: {
          'Authorization': `Bearer ${this.token}`,
        },
      });
      const j = await res.json();
      return j;
    }, 2000);
  }
  async connect({
    channels = [],
    dms = [],
    userWhitelist = [],
  }) {
    try {
      await this._attemptConnect({ channels, dms, userWhitelist });
    } catch (err) {
      await this._handleReconnect({ channels, dms, userWhitelist });
    }
  }

  async _attemptConnect({ channels, dms, userWhitelist }) {
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
      if (!this.isReconnecting) {
        this._handleReconnect({ channels, dms, userWhitelist }).catch(console.error);
      }
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
            // console.log('voice data', args);
            const {
              // userId,
              streamId,
              uint8Array,
            } = args;
            this.output.pushStreamUpdate(streamId, uint8Array);
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
            // console.log('text message', args);
            this.output.pushText(args);
            break;
          }
          case 'voicestart': {
            // console.log('voice start', args);
            this.output.pushStreamStart(args);
            break;
          }
          case 'voiceend': {
            // console.log('voice end', args);
            this.output.pushStreamEnd(args);
            break;
          }
          case 'voiceidle': { // feedback that discord is no longer listening
            // console.log('voice idle', args);
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

  async _handleReconnect(connectionParams) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
      throw new Error(`Failed to connect after ${this.maxReconnectAttempts} attempts`);
    }

    this.isReconnecting = true;
    this.reconnectAttempts++;

    console.log(`Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`);
    
    await new Promise(resolve => setTimeout(resolve, this.reconnectDelay));

    try {
      await this._attemptConnect(connectionParams);
      console.log('Reconnection successful');
      this.isReconnecting = false;
      this.reconnectAttempts = 0;
    } catch (err) {
      await this._handleReconnect(connectionParams);
    }
  }

  destroy() {
    this.isReconnecting = false;  // Stop any reconnection attempts
    this.ws && this.ws.close();
    this.input.destroy();
    this.output.destroy();
  }
}