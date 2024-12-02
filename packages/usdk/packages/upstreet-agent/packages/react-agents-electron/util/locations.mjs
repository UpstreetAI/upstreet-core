import path from 'path';
import { createRequire } from 'module';

//

const require = createRequire(import.meta.url);
function walkUpToNodeModules(modulePath) {
  let nodeModulesPath = modulePath;
  while (path.basename(nodeModulesPath) !== 'node_modules') {
    const oldNodeModulesPath = nodeModulesPath;
    nodeModulesPath = path.dirname(nodeModulesPath);
    if (nodeModulesPath === oldNodeModulesPath) {
      throw new Error('could not find node_modules');
    }
  }
  return nodeModulesPath;
}

//

export const electronBinPath = require.resolve('electron/cli.js');
export const electronStartScriptPath = require.resolve('react-agents-electron/electron-main.mjs');