import path from 'path';
import fs from 'fs';
import { mkdirp } from 'mkdirp';
import { rimraf } from 'rimraf';
import toml from '@iarna/toml';
import { getCurrentDirname } from '../react-agents/util/path-util.mjs';

const dirname = getCurrentDirname(import.meta, process);
const copyWithStringTransform = async (src, dst, transformFn = (s) => s) => {
  let s = await fs.promises.readFile(src, 'utf8');
  s = transformFn(s);
  await mkdirp(path.dirname(dst));
  await fs.promises.writeFile(dst, s);
};
const buildWranglerToml = (
  t,
  opts = {},
) => {
  for (const k in opts) {
    t[k] = opts[k];
  }
  return t;
};

const upstreetAgentDir = path.join(dirname, '..', '..');

function walkUpToNodeModules(modulePath) {
  let nodeModulesPath = modulePath;
  while (path.basename(nodeModulesPath) !== 'node_modules') {
    const oldNodeModulesPath = nodeModulesPath;
    nodeModulesPath = path.dirname(nodeModulesPath);
    if (nodeModulesPath === oldNodeModulesPath) {
      return null;
    }
  }
  return nodeModulesPath;
}
async function resolveModule(name, {
  paths,
}) {
  for (let nodeModulesPath = paths[0]; nodeModulesPath !== null;) {
    const checkPath = path.join(nodeModulesPath, name);
    let exists = false;
    try {
      await fs.promises.lstat(checkPath);
      exists = true;
    } catch (e) {}
    if (exists) {
      return checkPath;
    }

    nodeModulesPath = walkUpToNodeModules(path.join(nodeModulesPath, '..'));
    if (nodeModulesPath === null) {
      break;
    }
  }
  return null;
}

export const installAgent = async (directory) => {
  const packageJson = JSON.parse(await fs.promises.readFile(path.join(upstreetAgentDir, 'package.json'), 'utf8'));
  const dependencies = Object.keys(packageJson.dependencies);

  const agentJsonString = await fs.promises.readFile(path.join(directory, 'agent.json'), 'utf8');
  const agentJson = JSON.parse(agentJsonString);

  const srcNodeModules = path.join(upstreetAgentDir, 'node_modules');
  const dstNodeModules = path.join(directory, 'node_modules');
  await mkdirp(dstNodeModules);

  const srcRootMainTsx = path.join(upstreetAgentDir, 'packages', 'react-agents-node', 'root-main.tsx');
  const dstRootMainTsx = path.join(directory, 'root-main.tsx');

  const srcMainJsx = path.join(upstreetAgentDir, 'main.jsx');
  const dstMainJsx = path.join(directory, 'main.jsx');

  const srcDurableObjectTsx = path.join(upstreetAgentDir, 'durable-object.tsx');
  const dstDurableObjectTsx = path.join(directory, 'durable-object.tsx');

  const srcWranglerToml = path.join(upstreetAgentDir, 'wrangler.toml');
  const dstWranglerToml = path.join(directory, `wrangler.toml`);

  const srcInitTs = path.join(upstreetAgentDir, 'init.ts');
  const dstInitTs = path.join(directory, `init.ts`);

  const agentPath = directory;

  // remove old dependencies in node_modules
  const removeDependencies = async () => {
    await Promise.all(dependencies.map(async (name) => {
      const d = path.dirname(name);
      if (d !== '.') { // has /
        // remove the directory
        await rimraf(path.join(dstNodeModules, d));
      } else {
        const dst = path.join(dstNodeModules, name);
        await rimraf(dst);
      }
    }));
  };
  await removeDependencies();

  // symlink node_modules deps
  const addDependencies = async () => {
    await Promise.all(dependencies.map(async (name) => {
      const d = path.dirname(name);
      if (d !== '.') { // has /
        // precreate the directory
        await mkdirp(path.join(dstNodeModules, d));
      }
      const src = await resolveModule(name, { paths: [
        path.join(upstreetAgentDir, 'node_modules'),
      ] });
      if (src) {
        const dst = path.join(dstNodeModules, name);
        await fs.promises.symlink(src, dst);
      } else {
        throw new Error('install agent link: could not find root for: ' + name);
      }
    }));
  };
  await addDependencies();

  // add new files
  await Promise.all([
    // wrangler.toml
    copyWithStringTransform(srcWranglerToml, dstWranglerToml, (s) => {
      let t = toml.parse(s);
      t = buildWranglerToml(t, {
        name: `user-agent-${agentJson.id}`,
        // main: `.agents/${name}/main.jsx`,
        // main: `main.jsx`,
      });
      return toml.stringify(t);
    }),
    // init.ts
    copyWithStringTransform(srcInitTs, dstInitTs),
    // main.jsx
    copyWithStringTransform(srcMainJsx, dstMainJsx),
    // durable-object.tsx
    copyWithStringTransform(srcDurableObjectTsx, dstDurableObjectTsx),
    // entry.mjs
    copyWithStringTransform(srcRootMainTsx, dstRootMainTsx),
  ]);

  const cleanup = async () => {
    await Promise.all([
      rimraf(dstWranglerToml),
      rimraf(dstMainJsx),
      rimraf(dstDurableObjectTsx),
      rimraf(dstRootMainTsx),
      rimraf(dstInitTs),
      removeDependencies(),
    ]);
  };

  return {
    agentPath,
    wranglerTomlPath: dstWranglerToml,
    cleanup,
  };
};