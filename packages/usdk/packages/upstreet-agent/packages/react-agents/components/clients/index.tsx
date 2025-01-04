import React, { useState, useEffect } from 'react';
import { useRuntime } from 'react-agents';
// import { z } from 'zod';
import util from 'util';
import type {
  IAgentRuntime,
  State,
  Options,
  Memory,
  IActionHandlerAttachment,
  IActionHandlerCallbackArgs,
  HandlerFn,
  ValidateFn,
  IAction,
  IEvaluator,
  IProvider,
  IPlugin,
  Database,
  IAdapter,
  IRuntime,
  Client as ElizaClient,
} from '../types/eliza.d.ts';

//

type ClientProps = {
  client: ElizaClient;
  parameters: any;
};
export const Client: React.FC<ClientProps> = (props: ClientProps) => {
  const {
    client,
    parameters,
  } = props;
  const runtime = useRuntime();

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    let live = true;
    signal.addEventListener('abort', () => {
      live = false;
    });

    (async () => {
      const instance = await client.start(runtime);
      if (live) {
        signal.addEventListener('abort', async () => {
          await instance.stop(runtime);
        });
      } else {
        await instance.stop(runtime);
      }
    })();

    return () => {
      abortController.abort();
    };
  }, []);

  return (
    <>
    </>
  );
};