import { useContext, useEffect } from 'react';
import { useAgent, useAuthToken } from 'react-agents';
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
    channels,
    dms,
    userWhitelist,
  } = props;
  const agent = useAgent();
  const appContextValue = useContext(AppContext);
  const codecs = appContextValue.useCodecs();
  const authToken = useAuthToken();

  useEffect(() => {
    const args: DiscordArgs = {
      token,
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
  }, [
    token,
    JSON.stringify(channels),
    JSON.stringify(dms),
    JSON.stringify(userWhitelist),
  ]);

  return null;
};