import path from 'path';
import fs from 'fs';
import readline from 'readline';

import packageJson from '../package.json' with { type: 'json' };
import { rimraf } from 'rimraf';
import toml from '@iarna/toml';
import pc from 'picocolors';
import { isYes } from './isYes.js'
import {
  BASE_DIRNAME,
} from './locations.mjs';
import {
  parseAgentSpecs,
} from './agent-spec-utils.mjs';
import { getDirectoryHash } from '../util/hash-util.mjs';
import { recursiveCopyAll } from '../util/copy-utils.mjs';
import { hasNpm, npmInstall } from '../lib/npm-util.mjs';

const isDirectory = async (dir) => {
  try {
    const stats = await fs.promises.lstat(dir);
    return stats.isDirectory();
  } catch (err) {
    if (err.code === 'ENOENT') {
      return false;
    } else {
      throw err;
    }
  }
};

export const update = async (args, opts) => {
  const agentSpecs = await parseAgentSpecs(args._[0]);
  if (!agentSpecs.every((agentSpec) => !!agentSpec.directory)) {
    throw new Error('all agent specs must have directories');
  }
  // opts
  const force = !!args.force;

  // update the agents
  for (const agentSpec of agentSpecs) {
    const { directory } = agentSpec;

    console.log(pc.italic(`Updating agent ${directory}...`));

    const agentJsonPath = path.join(directory, 'agent.json');
    const packagesPathSrc = path.join(BASE_DIRNAME, 'packages');
    const packagesPathDst = path.join(directory, 'packages');

    // read the agent json
    // const wranglerTomlString = await fs.promises.readFile(wranglerTomlPath, 'utf8');
    // const wranglerToml = toml.parse(wranglerTomlString);
    const agentJsonString = await fs.promises.readFile(agentJsonPath, 'utf8');
    let agentJson = JSON.parse(agentJsonString);

    // hash the packages directories
    const [srcPackagesHash, dstPackagesHash] = await Promise.all([
      getDirectoryHash(packagesPathSrc),
      (async () => {
        const isDir = await isDirectory(packagesPathDst);
        if (isDir) {
          return getDirectoryHash(packagesPathDst);
        } else {
          return '<not found>';
        }
      })(),
    ]);

    // check for conflicts
    const needsUpdate = (agentJson.version !== packageJson.version) ||
      (srcPackagesHash !== dstPackagesHash);
    if (needsUpdate) {
      if (srcPackagesHash !== dstPackagesHash && !force) {
        const rl = readline.promises.createInterface({
          input: process.stdin,
          output: process.stdout,
        });

        console.log(`\nAgent ${directory} is outdated.`);
        console.log(`Source checksum: ${srcPackagesHash}`);
        console.log(`Destination checksum: ${dstPackagesHash}`);
        const answer = await rl.question(`\nOverwrite the contents of "${path.resolve(packagesPathDst)}"? ${pc.cyan('y/N')}: `);
        rl.close();
        console.log();

        if (!isYes(answer)) {
          throw new Error('aborted');
        }
      }

      // remove the destination packages directory
      await rimraf(packagesPathDst);

      // perform the update
      await recursiveCopyAll(packagesPathSrc, packagesPathDst);

      // update the agent json version
      {
        // update the version
        const { version } = packageJson;
        agentJson = {
          ...agentJson,
          version,
        };
        // write the agent json
        // wranglerToml.vars.AGENT_JSON = JSON.stringify(agentJson);
        // await fs.promises.writeFile(agentJsonPath, toml.stringify(wranglerToml));
        await fs.promises.writeFile(agentJsonPath, JSON.stringify(agentJson, null, 2));
      }

      const has = await hasNpm();
      if (has) {
        console.log(pc.italic('Installing dependencies...'));
        try {
          await npmInstall(directory);
        } catch(err) {
          console.warn('failed to install dependencies:', err.stack);
        }
      } else {
        console.warn('pnpm not found; skipping dependency install. Your agent may not work correctly.');
        console.warn('To install dependencies, run `pnpm install` in the agent directory.');
      }

      console.log(pc.green(`Agent ${directory} updated to version ${packageJson.version}`));
    } else {
      console.log(pc.green(`Agent ${directory} is up to date at version ${packageJson.version}`));
    }
  }
};