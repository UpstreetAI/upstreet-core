import dotenv from 'dotenv';
import { AgentMain } from 'react-agents/entry.ts';
import userRender from '../../agent.tsx'; // note: this will be overwritten by the build process
import envTxt from '../../.env.txt';
// import configTxt from '../../config.txt';
import agentJsonTxt from '../../agent.json';
import * as codecs from 'codecs/ws-codec-runtime-edge.mjs';

Error.stackTraceLimit = 300;

// CloudFlare Worker Durable Object class
export class DurableObject {
  agentMain: AgentMain;
  loadPromise: Promise<AgentMain> = null;

  constructor(state: any, env: any) {
    const config = (() => {
      try {
        return JSON.parse(agentJsonTxt);
      } catch (e) {
        console.warn('Warning: failed to parse config.txt:', e);
        return {};
      }
    })();
    const state2 = {
      ...state,
      config,
      userRender,
      codecs,
    };
    const auth2 = dotenv.parse(envTxt);
    this.loadPromise = (async() => {
      const agentMain = new AgentMain(state2, env, auth2);
      // await agentMain.waitForLoad();
      return agentMain;
    })();
  }
  async fetch(request: Request) {
    const agentMain = await this.loadPromise;
    return await agentMain.fetch(request);
  }
  async alarm() {
    const agentMain = await this.loadPromise;
    return await agentMain.alarm();
  }
}
