import { ReactAgentsNodeRuntime } from '../packages/upstreet-agent/packages/react-agents-node/node-runtime.mjs';
import { devServerPort } from '../packages/upstreet-agent/packages/react-agents-wrangler/util/ports.mjs';
import { ReactAgentsWranglerRuntime } from '../packages/upstreet-agent/packages/react-agents-wrangler/wrangler-runtime.mjs';
import { ReactAgentsElectronRuntime } from '../packages/upstreet-agent/packages/react-agents-electron/electron-runtime.mjs';
import { parseAgentSpecs } from './agent-spec-utils.mjs';

export const runAgent = async (args, opts) => {
  const agentSpecs = await parseAgentSpecs(args._[0]);
  const runtime = args.runtime ?? 'node';
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
      return ReactAgentsElectronRuntime
    } else {
      throw new Error('unknown runtime: ' + runtime);
    }
  })();

  const runtimes = [];

  const startPromises = agentSpecs.map(async (agentSpec) => {
    if (agentSpec.directory) {
      const runtime = new Runtime(agentSpec);
      runtimes.push(runtime);
      await runtime.start({
        init,
        debug,
      });
      console.log(`Agent ${agentSpec.guid} running on URL: http://localhost:${devServerPort + agentSpec.portIndex}`);
    }
  });

  await Promise.all(startPromises);

  let isExiting = false;

  const handleExit = () => {
    if (isExiting) return;
    isExiting = true;
    console.log('\nTerminating all agent runtimes');
    runtimes.forEach(runtime => {
      const pid = runtime.cp.pid;
      console.log(`Terminating agent runtime with PID: ${pid}`);
      process.kill(pid);
    });
    process.exit();
  };

  process.on('exit', handleExit);
  process.on('SIGINT', handleExit);
  process.on('SIGTERM', handleExit);
  process.on('uncaughtException', handleExit);

  return;
};
