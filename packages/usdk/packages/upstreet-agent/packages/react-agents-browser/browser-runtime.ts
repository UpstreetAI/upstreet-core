import { FetchOpts } from './types';
import {
  SUPABASE_URL,
  SUPABASE_PUBLIC_API_KEY,
} from './secrets.mjs';

//

export class ReactAgentsWorker {
  worker: Worker;
  constructor({
    agentJson,
    agentSrc,
    apiKey,
    mnemonic,
  }: {
    agentJson: any,
    agentSrc: string,
    apiKey: string,
    mnemonic: string,
  }) {
    if (
      !agentJson ||
      !agentSrc ||
      !apiKey ||
      !mnemonic
    ) {
      throw new Error('missing required options: ' + JSON.stringify({
        agentJson,
        agentSrc,
        apiKey,
        mnemonic,
      }));
    }

    console.log('got agent src', agentSrc);

    this.worker = new Worker(new URL('./worker.ts', import.meta.url));

    const env = {
      AGENT_JSON: JSON.stringify(agentJson),
      // SUPABASE_URL,
      // SUPABASE_PUBLIC_API_KEY,
      WORKER_ENV: 'development', // 'production',
    };
    const auth = {
      AGENT_TOKEN: apiKey,
      WALLET_MNEMONIC: mnemonic,
    };
    console.log('starting worker with env:', env);
    this.worker.postMessage({
      method: 'init',
      args: {
        env,
        auth,
        agentSrc,
      },
    });
    this.worker.addEventListener('error', e => {
      console.warn('got error', e);
    });
  }
  // addEventListener(...args: Parameters<Worker['addEventListener']>) {
  //   return this.worker.addEventListener(...args);
  // }
  // removeEventListener(...args: Parameters<Worker['removeEventListener']>) {
  //   return this.worker.removeEventListener(...args);
  // }
  async fetch(url: string, opts: FetchOpts) {
    const requestId = crypto.randomUUID();
    const {
      method, headers, body,
    } = opts;
    this.worker.postMessage({
      method: 'request',
      args: {
        id: requestId,
        url,
        method,
        headers,
        body,
      },
    }, []);
    const res = await new Promise<Response>((accept, reject) => {
      const onmessage = (e: MessageEvent) => {
        // console.log('got worker message data', e.data);
        try {
          const { method } = e.data;
          switch (method) {
            case 'response': {
              const { args } = e.data;
              const {
                id: responseId,
              } = args;
              if (responseId === requestId) {
                cleanup();

                const {
                  error, status, headers, body,
                } = args;
                if (!error) {
                  const res = new Response(body, {
                    status,
                    headers,
                  });
                  accept(res);
                } else {
                  reject(new Error(error));
                }
              }
              break;
            }
            default: {
              console.warn('unhandled worker message method', e.data);
              break;
            }
          }
        } catch (err) {
          console.error('failed to handle worker message', err);
          reject(err);
        }
      };
      this.worker.addEventListener('message', onmessage);

      const cleanup = () => {
        this.worker.removeEventListener('message', onmessage);
      };
    });
    return res;
  }
  terminate() {
    this.worker.terminate();
  }
}