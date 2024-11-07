import {
  PendingActionMessage,
  AgentSpec,
  // AgentObject,
  // ActiveAgentObject,
} from '../types';

export const formatConversationMessage = (rawMessage: PendingActionMessage, {
  agent,
}: {
  agent: AgentSpec,
}) => {
  const { id: userId, name } = agent;
  const { method, args, attachments } = rawMessage;
  
  const timestamp = new Date();
  const newMessage = {
    userId,
    name,
    method,
    args,
    attachments,
    timestamp,
    hidden: false,
  };
  return newMessage;
};