import React, { Ref, useState, useMemo, useEffect, useContext, forwardRef, useImperativeHandle, memo } from 'react';
import type {
  AgentProps,
  RawAgentProps,
  ConversationObject,
  ConversationEventData,
} from '../../types';
import {
  AppContext,
  AgentContext,
  // ConversationContext,
  ConversationsContext,
  AgentRegistryContext,
} from '../../context';
import {
  DefaultAgentComponents,
} from '../util/default-components';
import {
  AgentRegistry,
} from '../../classes/render-registry';
import {
  ActiveAgentObject,
} from '../../classes/active-agent-object';
import {
  useConfig,
} from '../../hooks';
import { ExtendableMessageEvent } from '../../util/extendable-message-event';

//

/**
 * Represents an agent component.
 *
 * The `Agent` component is used to register an agent with the application context.
 * It takes an `AgentProps` object as its props and registers the agent with the app context.
 * The `Agent` component should be used as a parent component for other components that need access to the agent.
 *
 * @param props The props for the `Agent` component.
 * @returns The rendered `Agent` component.
 *
 * @example
 * ```tsx
 * <Agent>
 *   {/* child components *\/}
 * </Agent>
 * ```
 */
export const Agent = forwardRef(({
  config = useConfig(),
  children = [],
}: AgentProps, ref: Ref<ActiveAgentObject>) => {
  // hooks
  const appContextValue = useContext(AppContext);
  const conversationManger = appContextValue.useConversationManager();
  const [conversations, setConversations] = useState<ConversationObject[]>([]);
  const agentRegistry = useMemo(() => new AgentRegistry(), []);
  const agent = useMemo<ActiveAgentObject>(() => new ActiveAgentObject(config, {
    appContextValue,
    registry: agentRegistry,
  }), []);
  const [registryEpoch, setRegistryEpoch] = useState(0);

  // bind live/destroy
  useEffect(() => {
    agent.live();
    return () => {
      agent.destroy();
    };
  }, [agent]);

  // sync config
  useEffect(() => {
    agent.setConfig(config);
  }, [agent, config]);

  // wait for re-render on conversations change
  useEffect(() => {
    const updateConversations = (e: ExtendableMessageEvent<ConversationEventData>) => {
      setConversations(() => conversationManger.getConversations());

      // wait for re-render before returning from the handler
      e.waitUntil((async () => {
        const renderRegistry = agent.appContextValue.useRegistry();
        await renderRegistry.waitForUpdate();
      })());
    };
    conversationManger.addEventListener('conversationadd', updateConversations);
    conversationManger.addEventListener('conversationremove', updateConversations);
    return () => {
      conversationManger.removeEventListener('conversationadd', updateConversations);
      conversationManger.removeEventListener('conversationremove', updateConversations);
    };
  }, [conversationManger]);

  // epoch (for re-rendering)
  useEffect(() => {
    const onepochchange = (e: MessageEvent) => {
      setRegistryEpoch((registryEpoch) => registryEpoch + 1);
    };
    agent.addEventListener('epochchange', onepochchange);

    return () => {
      agent.removeEventListener('epochchange', onepochchange);
    };
  }, [agent]);

  // bind exported ref
  useImperativeHandle(ref, () => agent, [agent]);

  // render
  return (
    <agent value={agent}>
      <AgentContext.Provider value={agent}>
        <ConversationsContext.Provider value={{conversations}}>
          <AgentRegistryContext.Provider value={{agentRegistry}}>
            <DefaultAgentComponents />
            {children}
          </AgentRegistryContext.Provider>
        </ConversationsContext.Provider>
      </AgentContext.Provider>
    </agent>
  );
});
export const RawAgent = forwardRef((props: RawAgentProps, ref: Ref<ActiveAgentObject>) => {
  return <Agent {...props} raw ref={ref} />;
});
