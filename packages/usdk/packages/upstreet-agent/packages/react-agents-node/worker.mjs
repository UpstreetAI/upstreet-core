import path from 'path';
// import fs from 'fs';
import os from 'os';
import { program } from 'commander';
import { createServer as createViteServer } from 'vite';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';

//

['uncaughtException', 'unhandledRejection'].forEach(event => {
  process.on(event, err => {
    process.send({
      method: 'error',
      args: [err.stack],
    });
  });
});
process.addListener('SIGTERM', () => {
  process.exit(0);
});

//

const homeDir = os.homedir();

const loadModule = async (directory, p) => {
  const viteServer = await makeViteServer(directory);
  // console.log('get agent module 1');
  const entryModule = await viteServer.ssrLoadModule(p);
  // console.log('get agent module 2', entryModule);
  return entryModule.default;
};
const startRootServer = async ({
  root,
  ip,
  port,
}) => {
  const app = new Hono();

  app.all('*', (c) => {
    const req = c.req.raw;
    return root.fetch(req);
  });

  // create server
  const server = serve({
    fetch: app.fetch,
    // hostname: ip,
    port: parseInt(port, 10),
  });
  // wait for server to start
  await new Promise((resolve, reject) => {
    server.on('listening', () => {
      resolve(null);
    });
    server.on('error', (err) => {
      reject(err);
    });
  });
  // console.log(`Agent server listening on http://${ip}:${port}`);
};
const runAgent = async (directory, opts) => {
  const {
    ip,
    port,
    init: initString,
  } = opts;
  const init = initString && JSON.parse(initString);
  const debug = parseInt(opts.debug, 10);

  // we load it lioke this to perform a compilation
  const createRootMain = await loadModule(directory, 'root-main.tsx');
  const root = createRootMain({
    init,
    debug,
  });

  // wait for first render
  // await root.waitForLoad();

  await startRootServer({
    root,
    ip,
    port,
  });

  // console.log('worker send 1');
  process.send({
    method: 'ready',
    args: [],
  });
  // console.log('worker send 2');
};
const makeViteServer = async (directory) => {
  return await createViteServer({
    root: directory,
    cacheDir: path.join(homeDir, '.usdk', 'vite'),
    esbuild: {
      jsx: 'transform',
    },
    optimizeDeps: {
      entries: [
        './root-main.tsx',
      ],
    },
    ssr: {
      external: ['react', 'react-reconciler'],
    },
    resolve: {
      mainFields: ['main', 'module', 'browser'],
      // these proxies are necessary for vite to polyfill node builtins
      fs: import.meta.resolve('fs').replace('file://', ''),
      child_process: import.meta.resolve('child_process').replace('file://', ''),
      tls: import.meta.resolve('tls').replace('file://', ''),
    },
    assetsInclude: [/\.cdc$/],
  });
};

const main = async () => {
  let commandExecuted = false;

  program
    .command('run')
    .description('Run the agent')
    .argument(`[directory]`, `Agent directory`)
    .option('--var <vars...>', 'Environment variables in format KEY:VALUE')
    .requiredOption('--ip <ip>', 'IP address to bind to')
    .requiredOption('--port <port>', 'Port to bind to')
    .requiredOption('--init <json>', 'Initialization data')
    .option('-g, --debug [level]', 'Set debug level (default: 0)', '0')
    .action(async (directory, opts) => {
      commandExecuted = true;

      try {
        await runAgent(directory, opts);
      } catch (err) {
        console.warn(err);
        process.exit(1);
      }
    });

  const argv = process.argv.filter((arg) => arg !== '--');
  await program.parseAsync(argv);

  if (!commandExecuted) {
    console.error('Command missing');
    process.exit(1);
  }
};
main().catch(err => {
  console.error(err);
  process.exit(1);
});
