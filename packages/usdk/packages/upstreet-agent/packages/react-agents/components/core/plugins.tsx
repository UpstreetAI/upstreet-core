import React from 'react';
import type {
  AgentObject,
} from '../../types';
import {
  plugins,
} from '../plugins/index';

type PluginsProps = {
  config?: AgentObject;
};

export const Plugins = (props: PluginsProps) => {
  const pluginsConfig = props.config?.plugins ?? {};
  return (
    <>
      {Object.keys(pluginsConfig).map((key) => {
        const value = pluginsConfig[key];
        const Plugin = plugins[key];
        if (!Plugin) {
          throw new Error(`Plugin not found: ${key}`);
        }
        return (
          <Plugin {...value} key={key} />
        );
      })}
    </>
  );
};