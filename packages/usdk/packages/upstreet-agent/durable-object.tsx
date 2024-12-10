import dotenv from 'dotenv';
import { AgentMain } from 'react-agents/entry.ts';
import userRender from '../../agent.tsx'; // note: this will be overwritten by the build process
import * as codecs from 'codecs/ws-codec-runtime-edge.mjs';

Error.stackTraceLimit = 300;

function getEnvConfig(): Record<string, string> {
  let parsedEnv;
  try {
    const envTxt = require('../../.env.txt'); // Load the file only once
    parsedEnv = dotenv.parse(envTxt);
  } catch (err) {
    console.warn('⚠️ No .env.txt found. Your environment variables may become undefined in the code. Learn how to define environment variables here: https://docs.upstreet.ai/customize-your-agent#using-environment-variables', err);
    parsedEnv = {};
  }
  return parsedEnv;
}

// CloudFlare Worker Durable Object class
export class DurableObject {
  agentMain: AgentMain;

  constructor(state: any, env: any) {
    const state2 = {
      ...state,
      userRender,
      codecs,
    };
    const auth2 = getEnvConfig(); // Lazily load environment variables
    this.agentMain = new AgentMain(state2, env, auth2);
  }

  async fetch(request: Request) {
    return await this.agentMain.fetch(request);
  }

  async alarm() {
    return await this.agentMain.alarm();
  }
}
