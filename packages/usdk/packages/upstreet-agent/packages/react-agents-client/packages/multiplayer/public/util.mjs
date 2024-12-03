// import {MULTIPLAYER_PORT} from './constants.mjs';
import {zbencode, zbdecode} from 'zjs';
import {UPDATE_METHODS} from './update-types.mjs';

const alignN = n => index => {
  const r = index % n;
  return r === 0 ? index : (index + n - r);
};
const align4 = alignN(4);

const parseUpdateObject = uint8Array => zbdecode(uint8Array);

function makeid(length) {
  var result = '';
  var characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for (var i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}
const makeId = () => makeid(10);

function parseMessage(m) {
  const match = m.type.match(/^set\.(.+?)\.(.+?)$/);
  if (match) {
    const arrayId = match[1];
    const arrayIndexId = match[2];
    const {key, epoch, val} = m.data;
    return {
      type: 'set',
      arrayId,
      arrayIndexId,
      key,
      epoch,
      val,
    };
  } else {
    const match = m.type.match(/^add\.(.+?)$/);
    if (match) {
      const arrayId = match[1];
      const {arrayIndexId, val} = m.data;
      return {
        type: 'add',
        arrayId,
        arrayIndexId,
        val,
      };
    } else {
      const match = m.type.match(/^remove\.(.+?)$/);
      if (match) {
        const arrayId = match[1];
        const {arrayIndexId} = m.data;
        return {
          type: 'remove',
          arrayId,
          arrayIndexId,
        };
      } else {
        if (m.type === 'rollback') {
          const {arrayId, arrayIndexId, key, oldEpoch, oldVal} = m.data;
          return {
            type: 'rollback',
            arrayId,
            arrayIndexId,
            key,
            oldEpoch,
            oldVal,
          };
        } else if (m.type === 'import') {
          return {
            type: 'import',
            crdtExport: m.data.crdtExport,
          };
        } else if (m.type === 'syn') {
          const {synId} = m.data;
          return {
            type: 'syn',
            synId,
          };
        } else if (m.type === 'synAck') {
          const {synId} = m.data;
          return {
            type: 'synAck',
            synId,
          };
        } else if (m.type === 'deadhand') {
          const {keys, deadHand} = m.data;
          return {
            type: 'deadhand',
            keys,
            deadHand,
          };
        } else if (m.type === 'livehand') {
          const {keys, liveHand} = m.data;
          return {
            type: 'livehand',
            keys,
            liveHand,
          };
        } else if (m.type === 'networkinit') {
          return {
            type: 'networkinit',
            playerIds: m.data.playerIds,
          };
        } else if (m.type === 'join') {
          return {
            type: 'join',
            playerId: m.data.playerId,
          };
        } else if (m.type === 'leave') {
          return {
            type: 'leave',
            playerId: m.data.playerId,
          };
        } else if (m.type === 'register') {
          const {playerId} = m.data;
          return {
            type: 'register',
            playerId,
          };
        } else if (m.type === 'crdtUpdate') {
          const {update} = m.data;
          return {
            type: 'crdtUpdate',
            update,
          };
        } else if (m.type === 'lockRequest') {
          const {lockName} = m.data;
          return {
            type: 'lockRequest',
            lockName,
          };
        } else if (m.type === 'lockResponse') {
          const {lockName} = m.data;
          return {
            type: 'lockResponse',
            lockName,
          };
        } else if (m.type === 'lockRelease') {
          const {lockName} = m.data;
          return {
            type: 'lockRelease',
            lockName,
          };
        } else {
          console.warn('failed to parse', m);
          throw new Error('unrecognized message type: ' + m.type);
        }
      }
    }
  }
}

function serializeMessage(m) {
  const parsedMessage = parseMessage(m);
  const {type, arrayId, arrayIndexId} = parsedMessage;
  switch (type) {
    case 'import': {
      const {crdtExport} = parsedMessage;
      return zbencode({
        method: UPDATE_METHODS.IMPORT,
        args: [
          crdtExport,
        ],
      });
    }
    case 'syn': {
      const {synId} = parsedMessage;
      return zbencode({
        method: UPDATE_METHODS.SYN,
        args: [
          synId,
        ],
      });
    }
    case 'synAck': {
      const {synId} = parsedMessage;
      return zbencode({
        method: UPDATE_METHODS.SYN_ACK,
        args: [
          synId,
        ],
      });
    }
    case 'set': {
      const {key, epoch, val} = m.data;
      return zbencode({
        method: UPDATE_METHODS.SET,
        args: [
          arrayId,
          arrayIndexId,
          key,
          epoch,
          val,
        ],
      });
    }
    case 'add': {
      const {arrayIndexId, val, epoch} = m.data;
      return zbencode({
        method: UPDATE_METHODS.ADD,
        args: [
          arrayId,
          arrayIndexId,
          val,
          epoch,
        ],
      });
    }
    case 'remove': {
      const {arrayIndexId} = m.data;
      return zbencode({
        method: UPDATE_METHODS.REMOVE,
        args: [
          arrayId,
          arrayIndexId,
        ],
      });
    }
    case 'removeArray': {
      return zbencode({
        method: UPDATE_METHODS.REMOVE_ARRAY,
        args: [
          arrayId,
        ],
      });
    }
    case 'rollback': {
      const {arrayId, arrayIndexId, key, oldEpoch, oldVal} = m.data;
      return zbencode({
        method: UPDATE_METHODS.ROLLBACK,
        args: [
          arrayId,
          arrayIndexId,
          key,
          oldEpoch,
          oldVal,
        ],
      });
    }
    case 'deadhand': {
      // console.log('serialize dead hand');
      const {keys, deadHand} = m.data;
      return zbencode({
        method: UPDATE_METHODS.DEAD_HAND,
        args: [
          keys,
          deadHand,
        ],
      });
    }
    case 'livehand': {
      // console.log('serialize live hand');
      const {keys, liveHand} = m.data;
      return zbencode({
        method: UPDATE_METHODS.LIVE_HAND,
        args: [
          keys,
          liveHand,
        ],
      });
    }
    case 'networkinit': {
      const {playerIds} = m.data;
      return zbencode({
        method: UPDATE_METHODS.NETWORK_INIT,
        args: [
          playerIds,
        ],
      });
    }
    case 'join': {
      const {playerId} = m.data;
      return zbencode({
        method: UPDATE_METHODS.JOIN,
        args: [
          playerId,
        ],
      });
    }
    case 'leave': {
      const {playerId} = m.data;
      return zbencode({
        method: UPDATE_METHODS.LEAVE,
        args: [
          playerId,
        ],
      });
    }
    case 'register': {
      const {playerId} = m.data;
      return zbencode({
        method: UPDATE_METHODS.REGISTER,
        args: [
          playerId,
        ],
      });
    }
    case 'crdtUpdate': {
      const {update} = m.data;
      return zbencode({
        method: UPDATE_METHODS.CRDT_UPDATE,
        args: [
          update,
        ],
      });
    }
    case 'lockRequest': {
      const {lockName} = m.data;
      return zbencode({
        method: UPDATE_METHODS.LOCK_REQUEST,
        args: [
          lockName,
        ],
      });
    }
    case 'lockResponse': {
      const {lockName} = m.data;
      return zbencode({
        method: UPDATE_METHODS.LOCK_RESPONSE,
        args: [
          lockName,
        ],
      });
    }
    case 'lockRelease': {
      const {lockName} = m.data;
      return zbencode({
        method: UPDATE_METHODS.LOCK_RELEASE,
        args: [
          lockName,
        ],
      });
    }
    default: {
      console.warn('unrecognized message type', type);
      throw new Error('unrecognized message type: ' + type);
    }
  }
}

const getEndpoint = () => {
  const wss = 'wss://';
  let hostname = 'multiplayer.webaverse.workers.dev';

  // The local development server's WebSocket is provided at ws://localhost.
  const isDevelopment = location.hostname === 'local.webaverse.com';
  if (isDevelopment) {
    // wss = 'ws://';
    // hostname = `localhost:${MULTIPLAYER_PORT}`;
    hostname = location.host;
  }

  return `${wss}${hostname}`;
};
const createWs = (endpoint, roomname, playerId) => {
  const u = `${endpoint}/api/room/${roomname}/websocket${playerId ? `?playerId=${playerId}` : ''}`;
  const ws = new WebSocket(u);
  return ws;
};

const makePromise = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  promise.resolve = resolve;
  promise.reject = reject;
  return promise;
};

const zstringify = o => {
  let result = '';
  for (const k in o) {
    if (result) {
      result += '\n';
    }

    const v = o[k];
    if (v instanceof Float32Array) {
      result += `${JSON.stringify(k)}: Float32Array(${v.join(',')})`;
    } else {
      const s = JSON.stringify(v);
      if (s.length >= 20 && v instanceof Object && v !== null) {
        result += `${JSON.stringify(k)}:\n${zstringify(v)}`;
      } else {
        result += `${JSON.stringify(k)}: ${s}`;
      }
    }
  }
  return result;
};

export {
  alignN,
  align4,
  parseUpdateObject,
  makeId,
  parseMessage,
  serializeMessage,
  getEndpoint,
  createWs,
  makePromise,
  zstringify,
};
