import 'upstreet-agent/packages/react-agents/util/worker-globals.mjs';
import * as codecs from 'codecs/ws-codec-runtime-worker.mjs';
import { AgentMain } from 'react-agents/entry.ts';

//

const nativeImport = new Function('specifier', 'return import(specifier)');
const headersToObject = (headers: Headers) => {
  const result = {};
  for (const [key, value] of headers.entries()) {
    (result as any)[key] = value;
  }
  return result;
};

//

let agentMainPromise: Promise<AgentMain> | null = null;
globalThis.onmessage = (event: any) => {
  // console.log('got event', event.data);
  const method = event.data?.method;
  switch (method) {
    case 'init': {
      if (!agentMainPromise) {
        agentMainPromise = (async () => {
          const { args } = event.data;
          const { env, auth, agentSrc } = args;
          if (typeof agentSrc !== 'string') {
            throw new Error('agent worker: missing agentSrc');
          }

          const agentModule = await nativeImport(`data:application/javascript,${encodeURIComponent(agentSrc)}`);
          const userRender = agentModule.default;
          // console.log('got user render', userRender.toString());

          let alarmTimestamp: number | null = null;
          const state = {
            userRender,
            codecs,
            storage: {
              async getAlarm() {
                return alarmTimestamp;
              },
              setAlarm(timestamp: number) {
                alarmTimestamp = timestamp;
              },
            },
          };
          // console.log('worker init 1', {
          //   state,
          //   env,
          // });
          const agentMain = new AgentMain(state, env, auth);
          // console.log('worker init 2', {
          //   agentMain,
          // });
          return agentMain;
        })();
      } else {
        console.warn('agent worker: AgentMain already initialized', new Error().stack);
      }
      break;
    }
    case 'request': {
      (async () => {
        if (!agentMainPromise) {
          throw new Error('agent worker: AgentMain not initialized');
        }
        const agentMain = await agentMainPromise;

        const { args } = event.data;
        const {
          id,
          method,
          headers,
          body,
        } = args;
        if (!id) {
          throw new Error('request message missing id: ' + JSON.stringify(args));
        }

        let resultArrayBuffer = null;
        let resultStatus = null;
        let resultHeaders = null;
        let error = null;
        try {
          const request = new Request(args.url, {
            method,
            headers,
            body,
          });

          const res = await agentMain.fetch(request);
          // console.log('got agent main response', res.ok, res.status, res.headers);
          if (res.ok) {
            resultArrayBuffer = await res.arrayBuffer();
            resultStatus = res.status;
            resultHeaders = headersToObject(res.headers);
          } else {
            throw new Error('Failed to fetch: ' + res.status);
          }
        } catch (err) {
          console.error('Failed to fetch', err);
          error = err;
        }

        globalThis.postMessage({
          method: 'response',
          args: {
            id,
            status: resultStatus,
            body: resultArrayBuffer,
            headers: resultHeaders,
            error,
          },
        });
      })();
    }
  }
};