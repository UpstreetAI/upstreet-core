import {UPDATE_METHODS} from '../update-types.mjs';
import {handlesMethod} from './networked-video-client-utils.mjs';
import {parseUpdateObject, makeId} from '../util.mjs';
import {zbencode} from 'zjs';

export class NetworkedVideoClient extends EventTarget {
  constructor({
    playerId = makeId(),
  }) {
    super();

    this.playerId = playerId;

    this.ws = null;

    this.videoSourceCleanups = new Map(); // playerId:streamId -> function
  }

  addVideoSource(playableVideoStream) {
    // console.log('add video source', new Error().stack);

    const {
      id,
      // output,
      type,
      disposition,
    } = playableVideoStream;
    if (typeof id !== 'string') {
      throw new Error('video source id must be a string');
    }
    if (typeof type !== 'string') {
      throw new Error('video source type must be a string');
    }
    if (typeof disposition !== 'string') {
      throw new Error('video source disposition must be a string');
    }

    // console.log('send start', [
    //   this.playerId,
    //   id,
    //   type,
    //   disposition,
    // ]);
    this.ws.send(zbencode({
      method: UPDATE_METHODS.VIDEO_START,
      args: [
        this.playerId,
        id,
        type,
        disposition,
      ],
    }));

    // pump the reader
    let live = true;
    const finishPromise = (async () => {
      for await (const data of playableVideoStream) {
        if (live) {
          console.log('send video', [
            this.playerId,
            id,
            data,
          ]);
          this.ws.send(zbencode({
            method: UPDATE_METHODS.VIDEO,
            args: [
              this.playerId,
              id,
              data,
            ],
          }));
        } else {
          break;
        }
      }
    })();

    // add the cleanup fn
    const cleanup = () => {
      live = false;

      // console.log('send audio end', [
      //   this.playerId,
      //   id,
      // ]);
      this.ws.send(zbencode({
        method: UPDATE_METHODS.VIDEO_END,
        args: [
          this.playerId,
          id,
        ],
      }));
    };
    this.videoSourceCleanups.set(id, cleanup);

    return {
      waitForFinish: () => finishPromise,
    };
  }

  removeVideoSource(readableVideoStream) {
    // console.log('remove video source');
    const cleanupFn = this.videoSourceCleanups.get(readableVideoStream.id);
    cleanupFn();
    this.videoSourceCleanups.delete(readableVideoStream.id);
  }

  async connect(ws) {
    this.ws = ws;

    const _waitForOpen = () => new Promise((resolve, reject) => {
      resolve = (resolve => () => {
        resolve();
        _cleanup();
      })(resolve);
      reject = (reject => () => {
        reject();
        _cleanup();
      })(reject);

      this.ws.addEventListener('open', resolve);
      this.ws.addEventListener('error', reject);

      const _cleanup = () => {
        this.ws.removeEventListener('open', resolve);
        this.ws.removeEventListener('error', reject);
      };
    });
    await _waitForOpen();

    // console.log('irc listen');
    this.ws.addEventListener('message', e => {
      // console.log('got irc data', e.data);
      if (e?.data?.byteLength > 0) {
        const updateBuffer = e.data;
        const uint8Array = new Uint8Array(updateBuffer);
        const updateObject = parseUpdateObject(uint8Array);

        const {method /*, args */} = updateObject;
        if (handlesMethod(method)) {
          this.handleUpdateObject(updateObject);
        }
      } else {
        // debugger;
      }
    });
  }
  handleUpdateObject(updateObject) {
    const {method, args} = updateObject;
    // console.log('video update object', {method, args});
    if (method === UPDATE_METHODS.VIDEO) {
      // console.log('got video data', {method, args});
      const [
        playerId,
        streamId,
        data,
      ] = args;

      this.dispatchEvent(new MessageEvent('video', {
        data: {
          playerId,
          streamId,
          data,
        },
      }));
    } else if (method === UPDATE_METHODS.VIDEO_START) {
      const [
        playerId,
        streamId,
        type,
        disposition,
      ] = args;

      this.dispatchEvent(new MessageEvent('videostart', {
        data: {
          playerId,
          streamId,
          type,
          disposition,
        },
      }));
    } else if (method === UPDATE_METHODS.VIDEO_END) {
      const [
        playerId,
        streamId,
      ] = args;

      this.dispatchEvent(new MessageEvent('videoend', {
        data: {
          playerId,
          streamId,
        },
      }));
    } else {
      console.warn('unhandled video method: ' + method, updateObject);
      throw new Error('unhandled video method: ' + method);
    }
  }
}