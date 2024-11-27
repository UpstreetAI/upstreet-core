import path from 'path';
import os from 'os';
import { program } from 'commander';
import { createServer as createViteServer } from 'vite';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { app, screen, session, BrowserWindow, desktopCapturer } from 'electron';
import { WebSocket } from 'ws';
import { Button, Key, keyboard, mouse, Point } from '@nut-tree-fork/nut-js';

//

console.log('electron start script!');

['uncaughtException', 'unhandledRejection'].forEach(event => {
  process.on(event, err => {
    console.warn(err.stack);
  });
});
process.addListener('SIGTERM', () => {
  process.exit(0);
});

// electron doesn't provide a native WebSocket
// this is needed for needed for the multiplayer library
globalThis.WebSocket = WebSocket;

// agent code

const homeDir = os.homedir();

const loadModule = async (directory, p) => {
  const viteServer = await makeViteServer(directory);
  // console.log('get agent module 1');
  const entryModule = await viteServer.ssrLoadModule(p);
  // console.log('get agent module 2', entryModule);
  return entryModule.default;
};
const startAgentMainServer = async ({
  agentMain,
  ip,
  port,
}) => {
  const app = new Hono();

  let opened = false;
  app.post('/open', async (c) => {
    if (!opened) {
      opened = true;
      
      try {
        const req = c.req.raw;
        const j = await req.json();
        const {
          room,
          jwt,
          debug,
        } = j;

        await openFrontend({
          room,
          jwt,
          debug,
        });

        return new Response(JSON.stringify({
          ok: true,
        }), {
          headers: {
            'Content-Type': 'application/json',
          },
        });
      } catch (err) {
        console.warn(err);

        return new Response(JSON.stringify({
          error: err.stack,
        }), {
          status: 500,
          headers: {
            'Content-Type': 'application/json',
          },
        });
      }
    } else {
      return new Response(JSON.stringify({
        error: 'already opened',
      }), {
        status: 409,
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }
  });
  app.all('*', (c) => {
    const req = c.req.raw;
    return agentMain.fetch(req);
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
  const p = '/packages/upstreet-agent/packages/react-agents-node/entry.mjs';
  const main = await loadModule(directory, p);
  // console.log('worker loaded module', main);
  const agentMain = await main();
  // console.log('agentMain', agentMain);

  const {
    ip,
    port,
  } = opts;
  await startAgentMainServer({
    agentMain,
    ip,
    port,
  });
};
const makeViteServer = (directory) => {
  return createViteServer({
    root: directory,
    server: { middlewareMode: 'ssr' },
    cacheDir: path.join(homeDir, '.usdk', 'vite'),
    esbuild: {
      jsx: 'transform',
      // jsxFactory: 'React.createElement',
      // jsxFragment: 'React.Fragment',
    },
    optimizeDeps: {
      entries: [
        './packages/upstreet-agent/packages/react-agents-node/entry.mjs',
      ],
    },
  });
};

// frontend code

const host = 'https://chat.upstreet.ai';

const createOTP = async (jwt) => {
  const res = await fetch(
    `https://ai.upstreet.ai/api/register-otp?token=${jwt}`,
    {
      method: 'POST',
    },
  );

  if (res.ok) {
    return res.text();
  } else {
    throw new Error('Failed to create a one-time password.');
  }
};

const openFrontend = async ({
  room,
  jwt,
  debug,
}) => {
  // wait for the electron app to be ready
  await app.whenReady();

  // create the window
  {
    const primaryDisplay = screen.getPrimaryDisplay();
    const { width: displayWidth, height: displayHeight } = primaryDisplay.workAreaSize;

    const localWidth = 300;
    const localHeight = 400;

    // trade the jwt for an otp auth token
    const authToken = await createOTP(jwt);
    // construct the destination url
    const dstUrl = new URL(`${host}/desktop/${room}`);
    dstUrl.searchParams.set('desktop', 1 + '');
    // construct the final url
    const u = new URL(`${host}/login`);
    u.searchParams.set('auth_token', authToken);
    u.searchParams.set('referrer_url', dstUrl.href);

    // main window
    const win = new BrowserWindow({
      // width,
      // height,
      width: localWidth,
      height: localHeight,
      x: displayWidth - localWidth, // Position at right edge
      y: displayHeight - localHeight, // Position at bottom edge
      transparent: true,
      frame: false,
      hasShadow: false,
      alwaysOnTop: true,
      resizable: false,
      titleBarStyle: 'none',
      roundedCorners: false,
      webPreferences: {
        session: session.fromPartition('login'),
        // nodeIntegration: true,
      },
    });
    if (debug) {
      win.webContents.openDevTools();
    }
    win.loadURL(u.href);
  }
};

// main code

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
    .action(async (directory, opts) => {
      commandExecuted = true;

      try {
        await runAgent(directory, opts);

        // this will start signal that the electron process has successfully started
        console.log('electron main ready');
      } catch (err) {
        console.warn(err);
        process.exit(1);
      }
    });

  await program.parseAsync();

  if (!commandExecuted) {
    console.error('Command missing');
    process.exit(1);
  }
};
main().catch(err => {
  console.error(err);
  process.exit(1);
});