import fs from 'fs';
import toml from '@iarna/toml';
import dotenv from 'dotenv';
import { AgentMain } from './packages/upstreet-agent/packages/react-agents/entry.ts';
import * as codecs from './packages/upstreet-agent/packages/codecs/ws-codec-runtime-fs.mjs';
import userRender from './agent.tsx';
import { getCurrentDirname } from '../react-agents/util/path-util.mjs';
import path from 'path';

//

['uncaughtException', 'unhandledRejection'].forEach(event => {
  process.on(event, err => {
    console.error(err);
  });
});

//

// this file should be running from the agent's directory, so we can find the wrangler.toml file relative to it
const wranglerTomlPath = path.join(getCurrentDirname(import.meta, process), '../../../../wrangler.toml');
const envTxtPath = path.join(getCurrentDirname(import.meta, process), '../../../../.env.txt');

//

const getEnv = async () => {
  const wranglerTomlString = await fs.promises.readFile(wranglerTomlPath, 'utf8');
  const wranglerToml = toml.parse(wranglerTomlString);

  const agentJsonString = wranglerToml.vars.AGENT_JSON;
  if (!agentJsonString) {
    throw new Error('missing AGENT_JSON');
  }
  const agentJson = JSON.parse(agentJsonString);

  const env = {
    AGENT_JSON: JSON.stringify(agentJson),
    WORKER_ENV: 'development', // 'production',
  };
  return env;
};

const getAuth = async () => {
  const envTxtString = await fs.promises.readFile(envTxtPath, 'utf8');
  const envTxt = dotenv.parse(envTxtString);

  const apiKey = envTxt.AGENT_TOKEN;
  if (!apiKey) {
    throw new Error('missing AGENT_TOKEN');
  }

  const mnemonic = envTxt.WALLET_MNEMONIC;
  if (!mnemonic) {
    throw new Error('missing WALLET_MNEMONIC');
  }

  const auth = {
    AGENT_TOKEN: apiKey,
    WALLET_MNEMONIC: mnemonic,
  };
  return auth;
};

//

const main = async () => {
  const [
    env,
    auth,
  ] = await Promise.all([
    getEnv(),
    getAuth(),
  ]);

  let alarmTimestamp = null;
  const state = {
    userRender,
    codecs,
    storage: {
      async getAlarm() {
        return alarmTimestamp;
      },
      setAlarm(timestamp) {
        alarmTimestamp = timestamp;
      },
    },
  };
  const agentMain = new AgentMain(state, env, auth);
  return agentMain;
};
export default main;