import { z } from 'zod';
import { zodResponseFormat } from 'openai/helpers/zod';
import { aiProxyHost } from './const/endpoints.js';
import { defaultChatModel } from 'react-agents/constants.mjs';

export type ChatMessage = {
  role: string,
  content: string | {
    type: 'text',
    text: string,
  } | {
    type: 'image_url',
    image_url: {
      url: string,
    },
  },
};
const fetchChatCompletionFns = new Map<
  string,
  (args: any, opts: any) => Promise<string>
>(Object.entries({
  openai: async ({
    model,
    messages,
    stream,
    signal,
  }: {
    model: string
    messages: ChatMessage[],
    stream?: boolean,
    signal?: AbortSignal,
  }, {
    jwt,
  }: {
    jwt: string,
  }) => {
    if (!jwt) {
      throw new Error('no jwt');
    }
    const res = await fetch(`https://${aiProxyHost}/api/ai/chat/completions`, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        // 'OpenAI-Beta': 'assistants=v1',
        Authorization: `Bearer ${jwt}`,
      },

      body: JSON.stringify({
        model,
        messages,

        // stop: ['\n'],

        // response_format: {
        //   type: 'json_object',
        // },
        stream,
      }),
      signal,
    });
    if (res.ok) {
      const j = await res.json();
      const content = j.choices[0].message.content as string;
      return content;
    } else {
      const text = await res.text();
      throw new Error('error response in fetch completion: ' + res.status + ': ' + text);
    }
  },
  anthropic: async ({
    model,
    max_tokens,
    messages,
    stream,
    signal,
  }: {
    model: string,
    max_tokens: number,
    messages: ChatMessage[],
    stream?: boolean,
    signal?: AbortSignal,
  }, {
    jwt,
  }: {
    jwt: string,
  }) => {
    const res = await fetch(`https://${aiProxyHost}/api/claude/messages`, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${jwt}`,
      },

      body: JSON.stringify({
        model,
        max_tokens,
        messages,
        stream,
      }),
      signal,
    });
    if (res.ok) {
      const j = await res.json();
      const text = j.content[0].text as string;
      return text;
    } else {
      const text = await res.text();
      throw new Error('error response in fetch completion: ' + res.status + ': ' + text);
    }
  },
}));
export const fetchChatCompletion = async ({
  model = defaultChatModel,
  messages,
  stream,
  signal,
}: {
  model?: string,
  messages: ChatMessage[],
  stream?: boolean,
  signal?: AbortSignal,
}, {
  jwt,
}: {
  jwt: string,
}) => {
  const match = model.match(/^(.+?):/);
  if (match) {
    const modelType = match[1];
    const modelName = model.slice(match[0].length);
    const fn = fetchChatCompletionFns.get(modelType);
    if (fn) {
      const content = await fn({
        model: modelName,
        messages,
        stream,
        signal,
      }, {
        jwt,
      });
      return content;
    } else {
      throw new Error('invalid model type: ' + JSON.stringify(modelType));
    }
  } else {
    throw new Error('invalid model: ' + JSON.stringify(model));
  }
};

export const fetchJsonCompletion = async ({
  model = defaultChatModel, // XXX support multiple models here
  messages,
  stream,
  signal,
}: {
  model?: string,
  messages: ChatMessage[],
  stream?: boolean,
  signal?: AbortSignal,
}, format: z.ZodTypeAny, {
  jwt,
}: {
  jwt: string,
}) => {
  const match = model.match(/^(.+?):/);
  if (match) {
    const modelType = match[1];
    const modelName = model.slice(match[0].length);
    
    if (modelType === 'openai') {
      const res = await fetch(`https://${aiProxyHost}/api/ai/chat/completions`, {
        method: 'POST',

        headers: {
          'Content-Type': 'application/json',
          // 'OpenAI-Beta': 'assistants=v1',
          Authorization: `Bearer ${jwt}`,
        },

        body: JSON.stringify({
          model: modelName,
          messages,

          response_format: zodResponseFormat(format, 'result'),

          stream,
        }),
        signal,
      });
      if (res.ok) {
        const j = await res.json();
        const s = j.choices[0].message.content as string;
        const o = JSON.parse(s) as object;
        return o;
      } else {
        const text = await res.text();
        throw new Error('invalid status code: ' + res.status + ': ' + text);
      }
    } else {
      throw new Error('invalid model type: ' + JSON.stringify(modelType));
    }
  } else {
    throw new Error('invalid model: ' + JSON.stringify(model));
  }
}