import React from 'react';
import type {
  AgentObject,
} from '../../types';
import {
  clients,
} from '../clients/index';

type ClientsProps = {
  config?: AgentObject;
};

export const Clients = (props: ClientsProps) => {
  const clientsConfig = props.config?.clients ?? {};
  return (
    <>
      {Object.keys(clientsConfig).map((key) => {
        const value = clientsConfig[key];
        const Client = clients[key];
        if (!Client) {
          throw new Error(`Client not found: ${key}`);
        }
        return (
          <Client {...value} key={key} />
        );
      })}
    </>
  );
};