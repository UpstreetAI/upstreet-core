import React, { useContext, useEffect } from 'react';
import { useAgent, useAuthToken, useConversation } from 'react-agents';
import type {
  DiscordArgs,
  DiscordProps,
} from '../../types';
import {
  AppContext,
} from '../../context';

export const Discord: React.FC<DiscordProps> = (props: DiscordProps) => {
  const {
    token,
    appId,
    channels,
    dms,
    userWhitelist,
  } = props;
  const agent = useAgent();
  const conversation = useConversation();
  const appContextValue = useContext(AppContext);
  const codecs = appContextValue.useCodecs();
  const authToken = useAuthToken();

  useEffect(() => {
    if (!conversation) {
      const args: DiscordArgs = {
        token,
        appId,
        channels: channels ? (Array.isArray(channels) ? channels : [channels]) : [],
        dms: dms ? (Array.isArray(dms) ? dms : [dms]) : [],
        userWhitelist,
        agent,
        codecs,
        jwt: authToken,
      };
      const discordBot = agent.discordManager.addDiscordBot(args);
      return () => {
        agent.discordManager.removeDiscordBot(discordBot);
      };
    }
  }, [
    token,
    appId,
    JSON.stringify(channels),
    JSON.stringify(dms),
    JSON.stringify(userWhitelist),
    conversation,
  ]);

  return null;
};