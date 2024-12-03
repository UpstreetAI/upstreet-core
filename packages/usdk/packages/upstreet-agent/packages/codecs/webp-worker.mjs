import webp from 'webp-wasm';
import { zbdecode, zbencode } from 'zjs';
import { QueueManager } from 'queue-manager';

const encodeWebp = async (imageData, opts) => {
  const outputBuffer = await webp.encode(imageData, opts);
  const uint8Array = new Uint8Array(outputBuffer.buffer, outputBuffer.byteOffset, outputBuffer.byteLength);
  return uint8Array;
};
const decodeWebp = async (encodedData) => {
  const arrayBuffer = encodedData.buffer.slice(encodedData.byteOffset, encodedData.byteOffset + encodedData.byteLength);
  const imageData = await webp.decode(arrayBuffer);
  return imageData;
};

const queueManager = new QueueManager();
globalThis.onmessage = async (e) => {
  await queueManager.waitForTurn(async () => {
    let error, result;
    try {
      const b = e.data;
      const o = zbdecode(b);
      const {
        method,
        args,
      } = o;
      switch (method) {
        case 'encode': {
          const {
            imageData,
            opts,
          } = args;
          result = await encodeWebp(imageData, opts);
          break;
        }
        case 'decode': {
          const {
            encodedData,
          } = args;
          result = await decodeWebp(encodedData);
          break;
        }
        default: {
          throw new Error('unknown method: ' + method);
        }
      }
    } catch(err) {
      console.error(err);
      error = err;
    }

    let b;
    if (!error) {
      b = zbencode({ error: null, result });
    } else {
      b = zbencode({ error, result: null });
    }
    postMessage(b, [b.buffer]);
  });
};