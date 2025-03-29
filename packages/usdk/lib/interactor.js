import { z } from 'zod';
import dedent from 'dedent';
import { defaultModels } from '../packages/upstreet-agent/packages/react-agents/constants.mjs';
import { fetchJsonCompletion } from '../packages/upstreet-agent/packages/react-agents/util/fetch.mjs';
import { QueueManager } from 'queue-manager-async';

//

const makeCleanObjectFromSchema = (object, schema) => {
  if (schema && typeof schema === 'object' && schema._def && schema._def.typeName === 'ZodObject') {
    const shape = schema.shape;
    const result = structuredClone(object);
    for (const key in shape) {
      if (result[key] === undefined) {
        result[key] = object[key];
      }
    }
    return result;
  } else {
    throw new Error('invalid schema');
  }
}
const makeEmptyObjectFromSchema = (schema) => {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    const result = {};
    for (const key in shape) {
      result[key] = null;
    }
    return result;
  } else {
    throw new Error('invalid schema');
  }
};

//

export class Interactor extends EventTarget {
  jwt;
  object;
  objectFormat;
  formatFn;
  messages;
  queueManager;
  #isProcessing;

  constructor({
    systemPrompt,
    userPrompt,
    object,
    objectFormat,
    formatFn = o => o,
    jwt,
  }) {
    super();

    this.jwt = jwt;
    this.object = object ?
      makeCleanObjectFromSchema(object, objectFormat)
    :
      makeEmptyObjectFromSchema(objectFormat);
    this.objectFormat = objectFormat;
    this.formatFn = formatFn;
    this.messages = [
      {
        role: 'system',
        content:
          dedent`\
            You are an interactive configuration assistant designed to update a JSON configuration object on behalf of the user.
            Prompt the user for a question you need answered to update the configuration object.
            Be informal and succinct; do not directly ask for the fields. Hide the complexity and internal state, and auto-fill details where you can.
            Feel free to use artistic license or ask clarifying questions.
            
            Reply with a JSON object including a response to the user, an optional update object to merge with the existing one, and a done flag when you think it's time to end the conversation.
          ` + '\n\n' +
          dedent`\
            # Instructions
          ` + '\n' +
          systemPrompt + '\n\n' +
          dedent`\
            # Initial state
          ` + '\n' +
          JSON.stringify(this.object, null, 2),
      },
    ];
    if (userPrompt) {
      this.messages.push({
        role: 'user',
        content: userPrompt,
      });
    }
    this.queueManager = new QueueManager();
    this.#isProcessing = false;
  }

  get isProcessing() {
    return this.#isProcessing;
  }

  #setProcessingState(isProcessing) {
    this.#isProcessing = isProcessing;
    this.dispatchEvent(new MessageEvent('processingStateChange', {
      data: { isProcessing }
    }));
  }

  async write(text = '') {
    return await this.queueManager.waitForTurn(async () => {
      try {
        this.#setProcessingState(true);
        const { jwt, objectFormat, object, messages } = this;

        if (text) {
          messages.push({
            role: 'user',
            content: text,
          });
        }
        const o = await fetchJsonCompletion({
          model: defaultModels[0],
          messages,
        }, z.object({
          response: z.string(),
          updateObject: z.union([
            objectFormat,
            z.null(),
          ]),
          done: z.boolean(),
        }), {
          jwt,
        });
        const updateObject = this.formatFn(o.updateObject);
        if (updateObject) {
          for (const key in updateObject) {
            object[key] = updateObject[key];
          }
        }

        {
          const content = JSON.stringify(o, null, 2);
          const responseMessage = {
            role: 'assistant',
            content,
          };
          messages.push(responseMessage);
        }

        this.dispatchEvent(new MessageEvent('message', {
          data: {
            ...o,
            object,
          },
        }));
      } finally {
        this.#setProcessingState(false);
      }
    });
  }
  async end(text = '') {
    return await this.queueManager.waitForTurn(async () => {
      try {
        this.#setProcessingState(true);
        const { jwt, objectFormat, object, messages } = this;

        if (text) {
          messages.push({
            role: 'user',
            content: text,
          });
        }

        let o = await fetchJsonCompletion({
          model: defaultModels[0],
          messages,
        }, z.object({
          output: objectFormat,
        }), {
          jwt,
        });

        o = {
          response: '',
          updateObject: o.output,
          done: true,
        };

        const updateObject = this.formatFn(o.updateObject);
        if (updateObject) {
          for (const key in updateObject) {
            object[key] = updateObject[key];
          }
        }

        {
          const content = JSON.stringify(o, null, 2);
          const responseMessage = {
            role: 'assistant',
            content,
          };
          messages.push(responseMessage);
        }

        this.dispatchEvent(new MessageEvent('message', {
          data: {
            ...o,
            object,
          },
        }));
      } finally {
        this.#setProcessingState(false);
      }
    });
  }
}