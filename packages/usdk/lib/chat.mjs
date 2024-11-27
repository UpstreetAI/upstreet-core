import { parseAgentSpecs } from './agent-spec-utils.mjs';
import { ReactAgentsNodeRuntime } from '../packages/upstreet-agent/packages/react-agents-node/node-runtime.mjs';
import { ReactAgentsWranglerRuntime } from '../packages/upstreet-agent/packages/react-agents-wrangler/wrangler-runtime.mjs';
import { ReactAgentsElectronRuntime } from '../packages/upstreet-agent/packages/react-agents-electron/electron-runtime.mjs';
import {
  makeRoomName,
  connect,
  join,
  leave,
} from '../util/connect-utils.mjs';

//

export const chat = async (args, opts) => {
  // console.log('got chat args', args);
  const agentSpecs = await parseAgentSpecs(args._[0]);
  const room = args.room;
  const browser = args.browser;
  const runtime = args.runtime ?? 'node';
  const inputStream = args.inputStream;
  const outputStream = args.outputStream;
  const init = args.init ?? {};
  const debug = !!args.debug;
  // opts
  const jwt = opts.jwt;
  if (!jwt) {
    throw new Error('You must be logged in to chat.');
  }

  // start dev servers for the agents
  const Runtime = (() => {
    if (runtime === 'node') {
      return ReactAgentsNodeRuntime;
    } else if (runtime === 'wrangler') {
      return ReactAgentsWranglerRuntime;
    } else if (runtime === 'electron') {
      return ReactAgentsElectronRuntime;
    } else {
      throw new Error('unknown runtime: ' + runtime);
    }
  })();
  const runtimePromises = agentSpecs.map(async (agentSpec) => {
    if (agentSpec.directory) {
      const runtime = new Runtime(agentSpec);
      await runtime.start({
        init,
        debug,
      });
      return runtime;
    } else {
      return null;
    }
  });
  let runtimes = await Promise.all(runtimePromises);
  runtimes = runtimes.filter(Boolean);

  // wait for agents to join the multiplayer room
  const agentRefs = agentSpecs.map((agentSpec) => agentSpec.ref);
  const localRoom = room ?? makeRoomName(agentSpecs[0].guid);
  await join({
    _: [agentRefs, localRoom],
  });

  // connect to the chat
  const mode = (() => {
    if (browser) {
      return 'browser';
    } else if (inputStream && outputStream) {
      return 'stream';
    } else if (runtime === 'electron') {
      return 'electron';
    } else {
      return 'repl';
    }
  })();
  await connect({
    _: [localRoom],
    mode,
    inputStream,
    outputStream,
    runtimes,
    jwt,
    debug,
  });
};