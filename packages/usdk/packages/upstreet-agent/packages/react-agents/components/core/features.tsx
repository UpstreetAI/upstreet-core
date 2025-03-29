import React from 'react';
import type {
  AgentObject,
} from '../../types';
import {
  features,
} from '../features/index';

type FeaturesProps = {
  config?: AgentObject;
};

export const Features: React.FC<FeaturesProps> = (props: FeaturesProps) => {
  const featuresConfig = props.config?.features ?? {};
  return (
    <>
      {Object.keys(featuresConfig).map((key) => {
        const value = featuresConfig[key];
        const Feature = features[key];
        if (!Feature) {
          throw new Error(`Feature not found: ${key}`);
        }
        return (
          <Feature {...value} key={key} />
        );
      })}
    </>
  );
};