import React from 'react';
import { TTS } from './tts';
import { RateLimit } from './rate-limit';
import { Discord } from './discord';
import { Twitter } from './twitter';
import { Telnyx } from './telnyx';

export const features = {
  tts: ({voiceEndpoint}) => {
    return (
      <TTS voiceEndpoint={voiceEndpoint} />
    );
  },
  rateLimit: ({maxUserMessages, maxUserMessagesTime, message}) => {
    return (
      <RateLimit maxUserMessages={maxUserMessages} maxUserMessagesTime={maxUserMessagesTime} message={message} />
    );
  },
  discord: ({token, channels}) => {
    if (token) {
      channels = channels && channels.map((c: string) => c.trim()).filter(Boolean);
      return (
        <Discord token={token} channels={channels} />
      );
    } else {
      return null;
    }
  },
  twitterBot: ({token}) => {
    if (token) {
      return (
        <Twitter token={token} />
      );
    } else {
      return null;
    }
  },
  telnyx: ({apiKey, phoneNumber, message, voice}) => {
    if (apiKey) {
      return (
        <Telnyx apiKey={apiKey} phoneNumber={phoneNumber} message={message} voice={voice} />
      );
    } else {
      return null;
    }
  },
}
