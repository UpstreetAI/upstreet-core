import React from 'react';
import { Plugin } from 'react-agents';
import type {
  AgentObject,
} from '../../types';

type PluginsProps = {
  config?: AgentObject;
};

export const Plugins = (props: PluginsProps) => {
  const pluginsConfig = props.config?.plugins ?? [];
  return (
    <>
      {pluginsConfig.map((plugin: any) => {
        const {
          name,
          parameters,
        } = plugin;
        return (
          <Plugin name={name} parameters={parameters} key={name} />
        );
      })}
    </>
  );
};