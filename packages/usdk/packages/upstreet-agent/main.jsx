import './init.ts';
export { DurableObject } from './durable-object.tsx';
import { headers } from 'react-agents/constants.mjs';
import agentJsonSource from './agent.json';

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

async function handleAgentRequest(request, env) {
  const durableObjectId = env.AGENT.idFromName(agentJson.id);
  const stub = env.AGENT.get(durableObjectId);
  return await stub.fetch(request);
}

export default {
  async fetch(request, env, ctx) {
    try {
      if (request.method === 'OPTIONS') {
        return new Response('', {
          headers,
        });
      }

      // console.log('worker main request', request?.url);
      return await handleAgentRequest(request, env);
    } catch (err) {
      console.warn(err.stack);
      return new Response(err.stack, {
        status: 500,
        headers: {
          'Content-Type': 'text/plain',
          ...headers,
        },
      });
    }
  },
};
