import path from 'path';
import os from 'os';
import { createRequire } from 'module';

//

const require = createRequire(import.meta.url);
function walkUpToNodeModules(modulePath) {
  let nodeModulesPath = modulePath;
  while (path.basename(nodeModulesPath) !== 'node_modules') {
    nodeModulesPath = path.dirname(nodeModulesPath);
  }
  return nodeModulesPath;
}

//

const homedir = os.homedir();
const usdkProfileLocation = path.join(homedir, '.usdk');
export const loginLocation = path.join(usdkProfileLocation, 'login.json');
// const export walletLocation = path.join(usdkProfileLocation, 'wallet.json');

// this should point to the usdk roor directory
export const BASE_DIRNAME = (() => {
  let metaUrl = decodeURI(import.meta.url).replace('file://', '');
  if (os.platform() === 'win32') {
    metaUrl = metaUrl.replace(/^[/\\]+/, '');
  }

  // if we're not in dist, use the regular cli.js path
  if (path.basename(path.dirname(metaUrl)) !== 'dist') {
    return path.normalize(
      path.join(metaUrl, '..', '..'),
    );
  } else {
    return path.normalize(
      path.join(metaUrl, '..', '..', '..'),
    );
  }
})();

export const certsLocalPath = path.join(BASE_DIRNAME, 'certs-local');
// export const templatesDirectory = path.join(BASE_DIRNAME, 'examples');

export const wranglerTomlPath = path.join(BASE_DIRNAME, 'packages', 'upstreet-agent', 'wrangler.toml');

// const jestModulePath = require.resolve('jest');
// const jestNodeModulesPath = walkUpToNodeModules(jestModulePath);
// export const jestBin = path.join(jestNodeModulesPath, '.bin', 'jest');
