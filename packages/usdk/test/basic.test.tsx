import React from 'react';
import { createRoot } from 'react-agents';
import * as codecs from 'codecs/ws-codec-runtime-fs.mjs';

test('createRoot', async () => {
  const indexJson = await (async () => {
    const res = await fetch(`https://rawcdn.githack.com/elizaos-plugins/registry/5e4878e235b0ff8fe823c20ff46e4ab45b68d8b9/index.json`);
    const j = res.json();
    return j;
  })();
  
  const plugins = [];
  for (const [name, ref] of Object.entries(indexJson)) {
    const plugin = {
      name,
      parameters: {},
    };
    plugins.push(plugin);
  }

  const agentJson = {
    id: "b94ed43d-4305-4b38-a3b6-4d5b3b6a8fc3",
    ownerId: "4cf9f0df-6ec4-4c44-8251-c1cbb61f7a6b",
    address: "0x5f7b45a76a71b68d114d7868be9b5ad8870ba678",
    stripeConnectAccountId: "",
    name: "AI Agent 77139",
    description: "Created by the AI Agent SDK",
    bio: "A cool AI",
    model: "openai:gpt-4o-2024-08-06",
    smallModel: "openai:gpt-4o-mini",
    largeModel: "openai:o1-preview",
    startUrl: "https://user-agent-b94ed43d-4305-4b38-a3b6-4d5b3b6a8fc3.isekaichat.workers.dev",
    previewUrl: "",
    homespaceUrl: "",
    avatarUrl: "",
    voiceEndpoint: "elevenlabs:scillia:kNBPK9DILaezWWUSHpF9",
    voicePack: "ShiShi voice pack",
    capabilities: [],
    version: "0.0.108",
    // plugins,
    plugins: [],
  };
  const state = {
    agentJson,
    env: {},
    enivronment: 'development',
    codecs,
  };
  const root = createRoot(state);
  root.render(<></>);
});