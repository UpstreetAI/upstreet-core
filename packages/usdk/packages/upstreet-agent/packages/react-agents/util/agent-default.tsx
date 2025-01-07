import React from 'react';
import { Agent, Features, Clients, Plugins } from 'react-agents';
import config from './agent.json';

export default function MyAgent() {
  return (
    <Agent config={config}>
      <Features config={config} />
      <Clients config={config} />
      <Plugins config={config} />
      {/* ... */}
    </Agent>
  );
};