import path from 'path';
import fs from 'fs';
import readline from 'readline';

import { mkdirp } from 'mkdirp';
import pc from 'picocolors';
import {
  parseAgentSpecs,
} from './agent-spec-utils.mjs';
import {
  getAgentAuthSpec,
} from '../util/agent-auth-util.mjs';
import {
  dotenvFormat,
} from '../util/dotenv-util.mjs';
import { isYes } from './isYes.js'

//

const writeFile = async (dstPath, s) => {
  await mkdirp(path.dirname(dstPath));
  await fs.promises.writeFile(dstPath, s);
};

//

export const authenticate = async (args, opts) => {
  // args
  const agentSpecs = await parseAgentSpecs(args._[0]);
  if (!agentSpecs.every((agentSpec) => !!agentSpec.directory)) {
    throw new Error('all agent specs must have directories');
  }
  const force = !!args.force;
  // opts
  const jwt = opts.jwt;
  if (!jwt) {
    throw new Error('You must be logged in to create an agent.');
  }

  // update the agents
  for (const agentSpec of agentSpecs) {
    const { directory: dstDir } = agentSpec;

    // auth
    const agentAuthSpec = await getAgentAuthSpec(jwt);
    const {
      agentToken,
      mnemonic,
    } = agentAuthSpec;
    if (!agentToken) {
      throw new Error('Authorization error. Please try logging in again.')
    }

    const dstEnvTxt = path.join(dstDir, '.env.txt');

    // check if dstEnvTxt exists
    const exists = fs.existsSync(dstEnvTxt);
    if (exists && !force) {
      const rl = readline.promises.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const answer = await rl.question(`\nThere is already and authentication token at "${dstEnvTxt}". Overwrite? ${pc.cyan('y/N')}: `)
      rl.close();
      console.log();

      if (!isYes(answer)) {
        throw new Error('aborted');
      }
    }

    await writeFile(dstEnvTxt, dotenvFormat({
      AGENT_TOKEN: agentToken,
      WALLET_MNEMONIC: mnemonic,
    }));

    console.log(pc.green(`Authentication token written to "${dstEnvTxt}".`));
  }
};