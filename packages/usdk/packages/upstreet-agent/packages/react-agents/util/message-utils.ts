import {
  PendingActionMessage,
  AgentSpec,
  ActiveAgentObject,
  ActionMessage,
  // AgentObject,
  // ActiveAgentObject,
} from '../types';
import { MessageCache, CACHED_MESSAGES_LIMIT } from '../classes/message-cache';
import { loadMessagesFromDatabase } from './loadMessagesFromDatabase';

export const formatConversationMessage = (rawMessage: PendingActionMessage, {
  agent,
}: {
  agent: AgentSpec,
}): ActionMessage => {
  const { id: userId, name } = agent;
  const { method, args, attachments } = rawMessage;
  const id = crypto.randomUUID(); // generate a new id for the message

  const timestamp = new Date();
  const newMessage = {
    id,
    userId,
    name,
    method,
    args,
    attachments,
    timestamp,
    human: false,
    hidden: false,
  };
  return newMessage;
};


export const createMessageCache = ({
  agent,
  conversationId,
  agentId,
}: {
  agent: ActiveAgentObject;
  conversationId: string;
  agentId: string;
}) => {
  const supabase = agent.appContextValue.useSupabase();
  return new MessageCache({
    loader: async () => {
      const messages = await loadMessagesFromDatabase({
        supabase,
        conversationId,
        agentId,
        limit: CACHED_MESSAGES_LIMIT,
      });
      return messages;
    },
  });
};