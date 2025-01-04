import './init.ts';
import './main.jsx';
import React from 'react';
import dotenv from 'dotenv';
import { createRoot, Root } from 'react-agents/root.ts';
import * as codecs from 'codecs/ws-codec-runtime-edge.mjs';
import App from './agent.tsx';
import agentJsonSource from './agent.json';
import envTxt from './.env.txt';

const alarmTimeout = 10 * 1000;

const parseAgentJson = (agentJsonSource) => {
  try {
    if (typeof agentJsonSource === 'string') {
      return JSON.parse(agentJsonSource);
    } else if (typeof agentJsonSource === 'object') {
      return agentJsonSource;
    } else {
      throw new Error(`Invalid agent.json: ${agentJsonSource}`);
    }
  } catch (e) {
    console.warn(`Warning: failed to parse ${agentJsonSource}:`, e);
    return {};
  }
};
const agentJson = parseAgentJson(agentJsonSource);

// CloudFlare Worker Durable Object class
export class DurableObject {
  state: any;
  env: any;
  loadPromise: Promise<Root> = null;

  constructor(state: any, env: any) {
    this.state = state;
    this.env = env;

    const env2 = dotenv.parse(envTxt);
    const state2 = {
      agentJson,
      env: env2,
      enivronment: env?.WORKER_ENV ?? 'production',
      codecs,
    };
    this.loadPromise = (async() => {
      const root = createRoot(state2);
      root.render(<App />);
      return root;
    })();

    // initialize the alarm to prevent the worker from being evicted
    (async () => {
      await this.alarm();
    })();
  }
  async fetch(request: Request) {
    const root = await this.loadPromise;
    return await root.fetch(request);
  }
  async alarm() {
    this.state.storage.setAlarm(alarmTimeout);
  }
}
