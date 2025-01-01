import React, { useEffect, useState } from 'react';
import { useAgent, useConversation } from '../hooks';
import { LoopProps } from './types';
import { ReACTEvaluator } from '../evaluators/react-evaluator';
// import { PerceptionEvent } from '../classes/perception-event';
import { ConversationObject } from '../classes/conversation-object';
import { DeferConversation } from '../components/core/conversation';
import { createMessageCache } from '../util/message-utils';
import { Player } from 'react-agents-client/util/player.mjs';

export const ActionLoop = (props: LoopProps) => {
  return (
    // XXX this defer is here because otherwise the agent will try to send messages before a multiplayer connection is established
    // XXX we can remove this if we wait for multiplayer connection before sending new messages
    <DeferConversation>
      <ActionLoopInner {...props}>
        {props.children}
      </ActionLoopInner>
    </DeferConversation>
  );
};
// XXX make this per-conversation, with nukll conversation by default
const ActionLoopInner = (props: LoopProps) => {
  if (props.evaluator && (props.hint || props.actOpts)) {
    throw new Error('Cannot provide both evaluator and hint/actOpts');
  }

  const agent = useAgent();
  const hint = props.hint;
  const actOpts = props.actOpts;
  const debugOpts = {
    debug: agent.appContextValue.useDebug(),
  };
  const [evaluator, setEvaluator] = useState(() => props.evaluator ?? new ReACTEvaluator({
    hint,
    actOpts,
    debugOpts
  }));
  const contextConversation = useConversation();
  const [conversation, setConversation] = useState(() => {
    if (contextConversation) {
      return contextConversation;
    } else {
      const agentPlayer = new Player(agent.id, {
        name: agent.name,
        bio: agent.bio,
      });
      const conversationId = crypto.randomUUID();
      return new ConversationObject({
        agentPlayer,
        getHash: () => conversationId,
        messageCache: createMessageCache({
          agent,
          conversationId,
          agentId: agent.id,
        }),
      });
    }
  });
  const [generativeAgent, setGenerativeAgent] = useState(() => agent.generative({
    conversation,
  }));

  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    const recurse = async () => {
      console.log('infinite loop tick 1');
      await generativeAgent.evaluate(evaluator, {
        signal,
      });
      console.log('infinite loop tick 2');
      if (signal.aborted) return;

      await recurse();
    };
    recurse();

    return () => {
      abortController.abort();
    };
  }, []);

  return null;
};