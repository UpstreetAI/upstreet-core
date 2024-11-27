import crossSpawn from 'cross-spawn';
import { wranglerBinPath } from './util/locations.mjs';
import { devServerPort } from './util/ports.mjs';

//

process.addListener('SIGTERM', () => {
  process.exit(0);
});
const bindProcess = (cp) => {
  process.on('exit', () => {
    // console.log('got exit', cp.pid);
    try {
      process.kill(cp.pid, 'SIGTERM');
    } catch (err) {
      if (err.code !== 'ESRCH') {
        console.warn(err.stack);
      }
    }
  });
};
const waitForProcessIo = async (cp, matcher, timeout = 60 * 1000) => {
  const matcherFn = (() => {
    if (typeof matcher === 'string') {
      const s = matcher;
      return (s2) => s2.includes(s);
    } else if (matcher instanceof RegExp) {
      const re = matcher;
      return (s) => re.test(s);
    } else {
      throw new Error('invalid matcher');
    }
  })();
  await new Promise((resolve, reject) => {
    const bs = [];
    const onData = (d) => {
      bs.push(d);
      const s = Buffer.concat(bs).toString('utf8');
      if (matcherFn(s)) {
        cp.stdout.removeListener('data', onData);
        cp.stdout.removeListener('end', onEnd);
        clearTimeout(timeoutId);
        resolve(null);
      }
    };
    cp.stdout.on('data', onData);

    const bs2 = [];
    const onData2 = (d) => {
      bs2.push(d);
    };
    cp.stderr.on('data', onData2);

    const getDebugOutput = () =>
      Buffer.concat(bs).toString('utf8') +
      '\n' +
      Buffer.concat(bs2).toString('utf8')

    const onEnd = () => {
      reject(
        new Error('process ended without matching output: ' + getDebugOutput()),
      );
    };
    cp.stdout.on('end', onEnd);

    cp.on('exit', (code) => {
      reject(new Error(`failed to get start process: ${cp.pid}: ${code}`));
    });

    const timeoutId = setTimeout(() => {
      reject(
        new Error(
          'timeout waiting for process output: ' +
            JSON.stringify(cp.spawnfile) +
            ' ' +
            JSON.stringify(cp.spawnargs) +
            ' ' +
            getDebugOutput(),
        ),
      );
    }, timeout);
  });
};

//

export class ReactAgentsWranglerRuntime {
  agentSpec;
  cp = null;
  constructor(agentSpec) {
    this.agentSpec = agentSpec;
  }
  async start({
    init = {},
    debug = false,
  } = {}) {
    const {
      directory,
      portIndex,
    } = this.agentSpec;

    // spawn the wrangler child process
    const cp = crossSpawn(
      wranglerBinPath,
      [
        'dev',
        '--var', 'WORKER_ENV:development',
        '--ip', '0.0.0.0',
        '--port', devServerPort + portIndex,
        '--init', JSON.stringify(init),
      ],
      {
        stdio: 'pipe',
        // stdio: 'inherit',
        cwd: directory,
      },
    );
    bindProcess(cp);
    await waitForProcessIo(cp, /ready on /i);
    if (debug) {
      cp.stdout.pipe(process.stdout);
      cp.stderr.pipe(process.stderr);
    }
    this.cp = cp;
  }
  async terminate() {
    await new Promise((accept, reject) => {
      const { cp } = this;
      if (cp === null) {
        accept(null);
      } else {
        if (cp.exitCode !== null) {
          // Process already terminated
          accept(cp.exitCode);
        } else {
          // Process is still running
          const exit = (code) => {
            accept(code);
            cleanup();
          };
          cp.on('exit', exit);
          const error = (err) => {
            reject(err);
            cleanup();
          };
          cp.on('error', error);
          const cleanup = () => {
            cp.removeListener('exit', exit);
            cp.removeListener('error', error);
          };
          cp.kill('SIGTERM');
        }
      }
    });
  }
}