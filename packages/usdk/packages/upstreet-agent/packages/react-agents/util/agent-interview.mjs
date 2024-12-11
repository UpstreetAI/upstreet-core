import dedent from 'dedent';
import { z } from 'zod';
import {
  Interactor,
} from '../../../../../lib/interactor.js';
import {
  ValueUpdater,
} from '../../../../../lib/value-updater.js';
import {
  generateCharacterImage,
  generateBackgroundImage,
} from './generate-image.mjs';
import { makePromise, uploadBlob } from './util.mjs';
import {
  featureSpecs,
} from './agent-features-spec.mjs';

const processFeatures = (agentJson) => {
  const userSpecifiedFeatures = new Set(Object.keys(agentJson.features || {}));
  const validFeatures = new Set(featureSpecs.map(spec => spec.name));

  // Check for invalid user-specified features and throw an error if any are found
  for (const feature of userSpecifiedFeatures) {
    if (!validFeatures.has(feature)) {
      throw new Error(`Invalid features specified: ${feature}`);
    }
  }

  // allow the agent interview to possibly utilise all if no features are specified
  const allowAll = userSpecifiedFeatures.size === 0;

  const result = {};
  for (const featureSpec of featureSpecs) {
    const { name, schema } = featureSpec;
    if (allowAll || userSpecifiedFeatures.has(name)) {
      result[name] = schema.optional();
    }
  }


  // console.log('process features', {
  //   result,
  //   userSpecifiedFeatures,
  //   allowAll,
  // });

  return {
    result,
    userSpecifiedFeatures,
    allowAll,
  };
};

// Generate feature prompt
const generateFeaturePrompt = (featureSpecs, userSpecifiedFeatures, allowAll) => {
  const prompt =  allowAll ? (
    dedent`\
      The available features are:
    ` + '\n' +
    featureSpecs.map(({ name, description }) => {
      return `# ${name}\n${description}`;
    }).join('\n') + '\n\n'
  ) : (
    dedent`\
      The agent is given the following features:
    ` + '\n' +
    Array.from(userSpecifiedFeatures).map(feature => {
      const spec = featureSpecs.find(spec => spec.name === feature);
      return spec ? `# ${spec.name}\n${spec.description}` : `# ${feature}\nDescription not available.`;
    }).join('\n') + '\n\n'
  );

  // console.log('feature prompt', prompt);
  return prompt;
};

export class AgentInterview extends EventTarget {
  constructor(opts) {
    super();

    let {
      agentJson, // object
      prompt, // string
      mode, // 'auto' | 'interactive' | 'manual'
      jwt,
    } = opts;

    const { result: featureSchemas, userSpecifiedFeatures, allowAll } = processFeatures(agentJson);

    // generate the features available prompt
    const featuresAvailablePrompt = generateFeaturePrompt(featureSpecs, userSpecifiedFeatures, allowAll);

    // character image generator
    const visualDescriptionValueUpdater = new ValueUpdater(async (visualDescription, {
      signal,
    }) => {
      const {
        blob,
      } = await generateCharacterImage(visualDescription, undefined, {
        jwt,
      });
      return blob;
    });
    visualDescriptionValueUpdater.addEventListener('change', async (e) => {
      this.dispatchEvent(new MessageEvent('preview', {
        data: e.data,
      }));
    });

    // homespace image generator
    const homespaceDescriptionValueUpdater = new ValueUpdater(async (homespaceDescription, {
      signal,
    }) => {
      const {
        blob,
      } = await generateBackgroundImage(homespaceDescription, undefined , {
        jwt,
      });
      return blob;
    });
    homespaceDescriptionValueUpdater.addEventListener('change', async (e) => {
      this.dispatchEvent(new MessageEvent('homespace', {
        data: e.data,
      }));
    });

    const pumpIo = (response = '') => {
      this.dispatchEvent(new MessageEvent('input', {
        data: {
          question: response,
        },
      }));
    };
    const sendOutput = (text) => {
      this.dispatchEvent(new MessageEvent('output', {
        data: {
          text,
        },
      }));
    };
    this.loadPromise = makePromise();

    // initialize
    if (agentJson.previewUrl) {
      visualDescriptionValueUpdater.setResult(agentJson.previewUrl);
    }
    if (agentJson.homespaceUrl) {
      homespaceDescriptionValueUpdater.setResult(agentJson.homespaceUrl);
    }

    // interaction loop
    this.interactor = new Interactor({
      systemPrompt:
        dedent`\
          Configure an AI agent as specified by the user.
          
          \`name\`, \`bio\`, \`description\`, and \`visualDescription\` describe the character.
          \`bio\` describes the personality and character traits of the agent.
          \`description\` explains why other agents or users would want to interact with this agent. Keep it intriguing and concise.
          \`visualDescription\` visually describes the character without referring to their pose or emotion. This is an image prompt to use for an image generator. Update it whenever the character's visual description changes.
          e.g. 'girl with medium blond hair and blue eyes, purple dress, green hoodie, jean shorts, sneakers'
          \`homespacecDescription\` visually describe the character's homespace. This is also an image prompt, meant to describe the natural habitat of the character. Update it whenever the character's homespace changes.
          e.g. 'neotokyo, sakura trees, neon lights, path, ancient ruins, jungle, lush curved vine plants'
          
          Do not use placeholder values for fields and do not copy the above examples. Instead, make up something unique and appropriate for the character.
          ${mode == 'auto' ?
            `When you think the session is over, set the \`done\` flag.`
          :
            `When you think the session is over, then set the \`done\` flag. You might want to confirm with the user beforehand.`
          }
        ` + '\n\n' +
        featuresAvailablePrompt,
      userPrompt: prompt,
      object: agentJson,
      objectFormat: z.object({
        name: z.string().optional(),
        bio: z.string().optional(),
        description: z.string().optional(),
        visualDescription: z.string().optional(),
        homespaceDescription: z.string().optional(),
        features: z.object(featureSchemas).optional(),
      }),
      formatFn: (updateObject) => {
        updateObject = structuredClone(updateObject);
        // remove all optional features
        if (updateObject?.features) {
          for (const featureName in updateObject.features) {
            const value = updateObject.features[featureName];
            if (value === null || value === undefined) {
              delete updateObject.features[featureName];
            }
          }
        }
        return updateObject;
      },
      jwt,
    });
    this.interactor.addEventListener('processingStateChange', (event) => {
      this.dispatchEvent(new MessageEvent('processingStateChange', {
        data: event.data,
      }))
    });
    this.interactor.addEventListener('message', async (e) => {
      const o = e.data;

      const {
        response,
        updateObject,
        done,
        object,
      } = o;

      // external handling
      agentJson = object;
      if (updateObject) {
        const hasNonNullValues = obj =>
          Object.values(obj).some(value => value !== null && value !== undefined);

        const shouldDispatchProperty = (key, value) => {
          // skip visual/homespace descriptions as they're handled separately
          if (key === 'visualDescription' || key === 'homespaceDescription') {
            return false;
          }

          // For features object, only log if it has any non-null values
          if (key === 'features' && typeof value === 'object') {
            return hasNonNullValues(value);
          }

          // For other properties, log if they're not null/undefined
          return value !== null && value !== undefined;
        };

        Object.entries(updateObject)
          .filter(([key, value]) => shouldDispatchProperty(key, value))
          .forEach(([key, value]) => {
            this.dispatchEvent(new MessageEvent(key, {
              data: value
            }));
          });

        this.dispatchEvent(new MessageEvent('change', {
          data: {
            updateObject,
            agentJson,
          },
        }));
      }

      // internal handling
      if (updateObject?.visualDescription) {
        visualDescriptionValueUpdater.set(updateObject.visualDescription);
      }
      if (updateObject?.homespaceDescription) {
        homespaceDescriptionValueUpdater.set(updateObject.homespaceDescription);
      }

      // console.log('agent interview done', {
      //   done,
      //   response,
      // });
      if (!done) {
        // pump i/o
        pumpIo(response);
      } else {
        response && sendOutput(response);

        const getPreviewUrl = async (valueUpdater) => {
          const result = await valueUpdater.waitForLoad();

          if (typeof result === 'string') {
            return result;
          } else if (result instanceof Blob) {
            const guid = crypto.randomUUID();
            const p = ['avatars', guid, `image.jpg`].join('/');
            return await uploadBlob(p, result, {
              jwt,
            });
          } else if (result === null) {
            return null;
          } else {
            console.warn('invalid result type', result);
            throw new Error('invalid result type: ' + typeof result);
          }
        };

        // return result
        [
          agentJson.previewUrl,
          agentJson.homespaceUrl,
        ] = await Promise.all([
          getPreviewUrl(visualDescriptionValueUpdater),
          getPreviewUrl(homespaceDescriptionValueUpdater),
        ]);
        this.loadPromise.resolve(agentJson);
      }
    });
    setTimeout(() => {
      if (mode === 'auto') {
        // automatically run the interview to completion
        this.interactor.end();
      } else if (mode === 'interactive') {
        // initiate the interview with an introductory message
        pumpIo('What do you want your agent to do?');
      } else if (mode === 'edit') {
        // initiate the interview with an introductory message
        pumpIo('What edits do you want to make?');
      } else if (mode === 'manual') {
        // wait for external prompting
      } else {
        throw new Error(`invalid mode: ${mode}`)
      }
    }, 0);
  }
  write(response) {
    this.interactor.write(response);
  }
  async waitForFinish() {
    return await this.loadPromise;
  }
}