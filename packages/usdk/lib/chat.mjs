import { parseAgentSpecs } from './agent-spec-utils.mjs';
import { ReactAgentsNodeRuntime } from '../packages/upstreet-agent/packages/react-agents-node/node-runtime.mjs';
import { ReactAgentsWranglerRuntime } from '../packages/upstreet-agent/packages/react-agents-wrangler/wrangler-runtime.mjs';
import {
  makeRoomName,
  connect,
  join,
  leave,
} from '../util/connect-utils.mjs';
import { warnIfAgentsUseNewerSDKVersion } from './version.mjs';

//

export const chat = async (args, opts) => {
  // console.log('got chat args', args);
  const agentSpecs = await parseAgentSpecs(args._[0]);

  try {
    await warnIfAgentsUseNewerSDKVersion(agentSpecs, opts);
  } catch (error) {
    // do nothing
  }

  const room = args.room;
  const browser = args.browser;
  const runtime = args.runtime ?? 'node';
  const inputStream = args.inputStream;
  const outputStream = args.outputStream;
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
    } else {
      throw new Error('unknown runtime: ' + runtime);
    }
  })();
  const startPromises = agentSpecs.map(async (agentSpec) => {
    if (agentSpec.directory) {
      const runtime = new Runtime(agentSpec);
      await runtime.start({
        debug,
      });
    }
  });
  await Promise.all(startPromises);

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
    } else {
      return 'repl';
    }
  })();
  await connect({
    _: [localRoom],
    mode,
    inputStream,
    outputStream,
    debug,
  });
};