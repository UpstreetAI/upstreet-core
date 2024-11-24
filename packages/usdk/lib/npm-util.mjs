import spawn from 'cross-spawn';

export const hasNpm = async () => {
  // check if the npm command exists
  return await new Promise((resolve) => {
    const child = spawn('npm', ['--version'], {
      stdio: 'ignore',
    });
    child.on('close', (code) => {
      if (code === 0) {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    child.on('error', (err) => {
      resolve(false);
    });
  });
};

export const npmInstall = async (dstDir) => {
  await new Promise((resolve, reject) => {
    const child = spawn('npm', ['install'], {
      cwd: dstDir,
      stdio: 'inherit',
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`npm install failed with code ${code}`));
      } else {
        resolve();
      }
    });
  });
};

const getNpmRoot = async () => {
  const { stdout } = await new Promise((resolve, reject) => {
    const child = spawn('npm', ['root', '--quiet', '-g']);

    let output = '';
    child.stdout.on('data', (data) => {
      output += data;
    });

    child.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`npm root failed with code ${code}`));
      } else {
        resolve({ stdout: output });
      }
    });
  });
  return stdout.trim();
};

export const ensureNpmRoot = (() => {
  let npmRootPromise = null;
  return () => {
    if (npmRootPromise === null) {
      npmRootPromise = getNpmRoot();
    }
    return npmRootPromise;
  };
})();