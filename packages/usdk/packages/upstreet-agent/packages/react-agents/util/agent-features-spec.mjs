import { z } from 'zod';
import dedent from 'dedent';
import { currencies, intervals } from '../constants.mjs';

export const paymentPropsType = z.object({
  name: z.string(),
  description: z.string().optional(),
  amount: z.number().int(),
  currency: z.enum(currencies),
});
export const paymentItemType = z.object({
  type: z.literal('payment'),
  props: paymentPropsType,
});
export const subscriptionPropsType = z.object({
  name: z.string(),
  description: z.string().optional(),
  amount: z.number().int(),
  currency: z.enum(currencies),
  interval: z.enum(intervals),
  intervalCount: z.number(),
});
export const subscriptionItemType = z.object({
  type: z.literal('subscription'),
  props: subscriptionPropsType,
});
export const storeItemType = z.union([
  paymentItemType,
  subscriptionItemType,
]);

//

export const defaultVoices = [
  {
    voiceEndpoint: 'elevenlabs:kadio:YkP683vAWY3rTjcuq2hX',
    name: 'Kaido',
    description: 'Teenage anime boy',
  },
  {
    voiceEndpoint: 'elevenlabs:drake:1thOSihlbbWeiCGuN5Nw',
    name: 'Drake',
    description: 'Anime male',
  },
  {
    voiceEndpoint: 'elevenlabs:terrorblade:lblRnHLq4YZ8wRRUe8ld',
    name: 'Terrorblade',
    description: 'Monstrous male',
  },
  {
    voiceEndpoint: 'elevenlabs:scillia:kNBPK9DILaezWWUSHpF9',
    name: 'Scillia',
    description: 'Teenage anime girl',
  },
  {
    voiceEndpoint: 'elevenlabs:mommy:jSd2IJ6Fdd2bD4TaIeUj',
    name: 'Mommy',
    description: 'Anime female',
  },
  {
    voiceEndpoint: 'elevenlabs:uni:PSAakCTPE63lB4tP9iNQ',
    name: 'Uni',
    description: 'Waifu girl',
  },
];

export const featureSpecs = [
  {
    name: 'tts',
    description: dedent`\
      Text to speech.
      Available voice endpoints:
    ` + '\n'
    + defaultVoices.map(v => `* ${JSON.stringify(v.name)}: ${v.voiceEndpoint}`).join('\n'),
    schema: z.union([
      z.object({
        voiceEndpoint: z.enum(defaultVoices.map(v => v.voiceEndpoint)),
      }),
      z.null(),
    ]),
    examples: [{voiceEndpoint: defaultVoices[0].voiceEndpoint},],
  },
  {
    name: 'rateLimit',
    description: dedent`\
      Agent is publicly available.
      The rate limit is \`maxUserMessages\` messages per \`maxUserMessagesTime\` milliseconds.
      When the rate limit is exceeded, the agent will respond with the static \`message\`.
      If either \`maxUserMessages\` or \`maxUserMessagesTime\` is not provided or zero, the rate limit is disabled.
    ` + '\n'
    + defaultVoices.map(v => `* ${JSON.stringify(v.name)}: ${v.voiceEndpoint}`).join('\n'),
    schema: z.union([
      z.object({
        maxUserMessages: z.number().optional(),
        maxUserMessagesTime: z.number().optional(),
        message: z.string().optional(),
      }),
      z.null(),
    ]),
    examples: [{ maxUserMessages: 5, maxUserMessagesTime: 60000, message: "Whoa there! Take a moment.", }],
  },
  {
    name: 'discord',
    description: dedent`\
      Add Discord integration to the agent. Add this feature only when the user explicitly requests it and provides a bot token.

      The user should follow these instructions to set up their bot (you can instruct them to do this):
      - Create a bot application at https://discord.com/developers/applications and note the CLIENT_ID (also called "application id")
      - Enable Privileged Gateway Intents at https://discord.com/developers/applications/CLIENT_ID/bot
      - Add the bot to your server at https://discord.com/oauth2/authorize/?permissions=-2080908480&scope=bot&client_id=CLIENT_ID
      - Get the bot token at https://discord.com/developers/applications/CLIENT_ID/bot
      The token is required and must be provided.

      \`channels\` is a list of channel names (text or voice) that the agent should join.
    `,
    schema: z.union([
      z.object({
        token: z.string(),
        channels: z.array(z.string()),
      }),
      z.null(),
    ]),
    examples: [{ token: 'YOUR_DISCORD_BOT_TOKEN', channels: ['general', 'voice'], }],
  },
  {
    name: 'twitterBot',
    description: dedent`\
      Add a Twitter bot to the agent.

      The API token is required.
    `,
    schema: z.union([
      z.object({
        token: z.string(),
      }),
      z.null(),
    ]),
    examples: [{ token: 'YOUR_TWITTER_BOT_TOKEN', }],
  },
  {
    name: 'telnyx',
    description: dedent`\
      Add Telnyx phone call/SMS support to the agent. Add this feature only when the user explicitly requests it and provides an api key.

      Phone number is optional, but if provided must be in +E.164 format (e.g. +14151234567).
    `,
    schema: z.union([
      z.object({
        apiKey: z.string(),
        phoneNumber: z.string().optional(),
        message: z.boolean(),
        voice: z.boolean(),
      }),
      z.null(),
    ]),
    examples: [{ apiKey: 'YOUR_TELNYX_API_KEY', phoneNumber: '+14151234567', message: true, voice: true, }],
  },
  {
    name: 'storeItems',
    description: dedent`\
      List of items that can be purchased from the agent, with associated prices.
      \`amount\` in cents (e.g. 100 = $1).
    `,
    schema: z.union([
      z.array(storeItemType),
      z.null(),
    ]),
    examples: [{type: 'payment', props: { name: 'Art', description: 'An art piece', amount: 499, currency: 'usd',},},],
  },
];