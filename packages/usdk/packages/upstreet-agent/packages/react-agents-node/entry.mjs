import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';
import { AgentMain } from './packages/upstreet-agent/packages/react-agents/entry.ts';
import * as codecs from './packages/upstreet-agent/packages/codecs/ws-codec-runtime-fs.mjs';
import userRender from './agent.tsx';
import { getCurrentDirname } from '../react-agents/util/path-util.mjs';

//

['uncaughtException', 'unhandledRejection'].forEach(event => {
  process.on(event, err => {
    console.error(err);
  });
});

//

const agentJsonTxtPath = path.join(getCurrentDirname(import.meta, process), '../../../../agent.json');
// this file should be running from the agent's directory, so we can find the wrangler.toml file relative to it
// const wranglerTomlPath = path.join(getCurrentDirname(import.meta, process), '../../../../wrangler.toml');
const envTxtPath = path.join(getCurrentDirname(import.meta, process), '../../../../.env.txt');

//

const getConfig = () => {
  const agentJsonTxt = fs.readFileSync(agentJsonTxtPath, 'utf8');
  const agentJson = JSON.parse(agentJsonTxt);
  return agentJson;
};
const getAuth = () => {
  const envTxtString = fs.readFileSync(envTxtPath, 'utf8');
  const envTxt = dotenv.parse(envTxtString);
  return envTxt;
};

//

const main = ({
  init = {},
  debug = 0,
} = {}) => {
  const config = getConfig();
  let alarmTimestamp = null;
  const state = {
    config,
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
  const env = {
    WORKER_ENV: 'development',
    init,
    debug,
  };
  const auth = getAuth();
  const agentMain = new AgentMain(state, env, auth);
  return agentMain;
};
export default main;