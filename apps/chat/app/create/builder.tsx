'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Editor, { useMonaco } from '@monaco-editor/react';
import { deployEndpointUrl, r2EndpointUrl } from '@/utils/const/endpoints';
import { getJWT } from '@/lib/jwt';
import { getUserIdForJwt, getUserForJwt } from '@/utils/supabase/supabase-client';
import type {
  StoreItem,
  SubscriptionProps,
  Currency,
  Interval,
} from 'react-agents/types';
import {
  createAgentGuid,
} from 'react-agents/util/guid-util.mjs';
import {
  getAgentToken,
} from 'react-agents/util/jwt-utils.mjs';
import {
  generateMnemonic,
} from '../../utils/etherium-utils.mjs';
import {
  Chat,
} from '@/components/chat/chat';
import { cn } from '@/lib/utils';
import { ensureAgentJsonDefaults } from 'react-agents/util/agent-json-util.mjs';
import {
  generateCharacterImage,
  generateBackgroundImage,
} from 'react-agents/util/generate-image.mjs';
import { AgentInterview } from 'react-agents/util/agent-interview.mjs';
import {
  defaultVoices,
} from 'react-agents/util/agent-features-spec.mjs';
import { makeAnonymousClient } from '@/utils/supabase/supabase-client';
import { env } from '@/lib/env'
import { defaultAgentSourceCode } from 'react-agents/util/agent-source-code-formatter.mjs';
import { currencies, intervals } from 'react-agents/constants.mjs';
import { buildAgentSrc } from 'react-agents-builder';
import { ReactAgentsWorker } from 'react-agents-browser';
import type { FetchableWorker } from 'react-agents-browser/types';
// import { IconButton } from 'ucom';
import { BackButton } from '@/components/back';
import { Button } from 'ucom';

//

const maxUserMessagesDefault = 5;
const maxUserMessagesTimeDefault = 60 * 60 * 24 * 1000; // 1 day
const rateLimitMessageDefault = '';

//

type ChatMessage = {
  role: string;
  content: string;
};

type FeaturesObject = {
  tts: {
    voiceEndpoint: string;
  } | null;
  rateLimit: {
    maxUserMessages: number;
    maxUserMessagesTime: number;
    message: string;
  } | null;
  storeItems: StoreItem[] | null;
  discord: {
    token: string;
    channels: string;
  } | null;
  twitterBot: {
    token: string;
  } | null;
};
type AgentEditorProps = {
  user: any;
};

// Create a reusable CloseButton component
const CloseButton = ({ onClick }: { onClick: (e: React.MouseEvent) => void }) => (
  <button
    className="text-gray-900 hover:text-gray-100 text-2xl"
    onClick={(e) => {
      e.stopPropagation();
      onClick(e);
    }}
  >
    ✕
  </button>
);

export default function Builder({
  user,
}: AgentEditorProps) {
  // state
  const [name, setName] = useState('');
  const [bio, setBio] = useState('');
  const [visualDescription, setVisualDescription] = useState('');
  const [homespaceDescription, setHomespaceDescription] = useState('');

  // const [model, setModel] = useState(defaultModels[0]);
  // const [visionModel, setVisionModel] = useState(defaultVisionModels[0]);

  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');

  const [homespaceBlob, setHomespaceBlob] = useState<Blob | null>(null);
  const [homespaceUrl, setHomespaceUrl] = useState('');

  const [deploying, setDeploying] = useState(false);
  const [room, setRoom] = useState('');
  const [starting, setStarting] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const [worker, setWorker] = useState<FetchableWorker | null>(null);

  const [builderPrompt, setBuilderPrompt] = useState('');

  const agentInterviewPromiseRef = useRef<Promise<AgentInterview> | null>(null);
  const [builderMessages, setBuilderMessages] = useState<ChatMessage[]>([]);

  const builderForm = useRef<HTMLFormElement>(null);
  const editorForm = useRef<HTMLFormElement>(null);

  const [voices, setVoices] = useState(() => defaultVoices.slice());
  const [features, setFeatures] = useState<FeaturesObject>({
    tts: null,
    rateLimit: null,
    storeItems: null,
    discord: null,
    twitterBot: null,
  });
  const [sourceCode, setSourceCode] = useState(defaultAgentSourceCode);

  const monaco = useMonaco();

  const [isPersonalityExpanded, setIsPersonalityExpanded] = useState(false);
  const [isVoiceExpanded, setIsVoiceExpanded] = useState(false);
  const [isRateLimitExpanded, setIsRateLimitExpanded] = useState(false);
  const [isDiscordExpanded, setIsDiscordExpanded] = useState(false);
  const [isTwitterExpanded, setIsTwitterExpanded] = useState(false);
  const [isStoreExpanded, setIsStoreExpanded] = useState(false);

  // effects
  // sync previewBlob -> previewUrl
  useEffect(() => {
    if (previewBlob) {
      const url = URL.createObjectURL(previewBlob);
      setPreviewUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setPreviewUrl('');
    }
  }, [previewBlob]);
  // sync homespaceBlob -> homespaceUrl
  useEffect(() => {
    if (homespaceBlob) {
      const url = URL.createObjectURL(homespaceBlob);
      setHomespaceUrl(url);

      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setHomespaceUrl('');
    }
  }, [homespaceBlob]);
  // load custom voices from account
  useEffect(() => {
    const abortController = new AbortController();
    const { signal } = abortController;

    (async () => {
      const jwt = await getJWT();
      const supabase = makeAnonymousClient(env, jwt);
      const result = await supabase
        .from('assets')
        .select('*')
        .eq('user_id', user.id)
        .eq('type', 'voice');
      if (signal.aborted) return;

      const error = result.error as any;
      const data = result.data as any;
      if (!error) {
        // console.log('got voices data 1', data);
        const userVoices = await Promise.all(data.map(async (voice: any) => {
          const res = await fetch(voice.start_url);
          const j = await res.json();
          return j;
        }));
        if (signal.aborted) return;

        // console.log('got voices data 2', userVoices);
        setVoices(voices => {
          return [
            ...userVoices,
            ...voices,
          ];
        });
      } else {
        console.warn('error loading voices', error);
      }
    })();
  }, []);
  // sync source code to editor
  useEffect(() => {
    if (monaco) {
      const model = getEditorModel(monaco);
      if (model) {
        const editorValue = getEditorValue(monaco);
        if (editorValue !== sourceCode) {
          model.setValue(sourceCode);
        }
      }
    }
  }, [monaco, sourceCode]);

  // helpers
  const makeDefaultTts = () => ({
    voiceEndpoint: voices[0].voiceEndpoint,
  });
  const makeDefaultRateLimit = () => ({
    maxUserMessages: maxUserMessagesDefault,
    maxUserMessagesTime: maxUserMessagesTimeDefault,
    message: rateLimitMessageDefault,
  });
  const makeDefaultDiscord = () => ({
    token: '',
    channels: '',
  });
  const makeDefaultTwitterBot = () => ({
    token: '',
  });
  const makeEmptyStoreItems = () => [
    makeEmptyStoreItem(),
  ];
  const makeEmptyStoreItem = () => ({
    type: 'payment',
    props: {
      name: '',
      description: '',
      amount: 100,
      currency: currencies[0] as Currency,
      interval: intervals[0] as Interval,
      intervalCount: 1,
    },
  });
  const getCloudPreviewUrl = async (previewBlob: Blob | null) => {
    if (previewBlob) {
      const jwt = await getJWT();
      const guid = crypto.randomUUID();
      const keyPath = ['assets', guid, 'avatar.jpg'].join('/');
      const u = `${r2EndpointUrl}/${keyPath}`;
      const res = await fetch(u, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${jwt}`,
        },
        body: previewBlob,
      });
      if (res.ok) {
        const j = await res.json();
        return j;
      } else {
        const text = await res.text();
        throw new Error(`could not upload avatar file: ${text}`);
      }
    } else {
      return null;
    }
  };
  const getEditorModel = (m = monaco) => m?.editor.getModels()[0] ?? null;
  const getEditorValue = (m = monaco) => getEditorModel(m)?.getValue() ?? '';
  async function startAgent({
    sourceCode = getEditorValue(),
  }: {
    sourceCode?: string;
  } = {}) {
    stopAgent();

    setStarting(true);

    const jwt = await getJWT();
    try {
      if (jwt) {
        const [
          userPrivate,
          {
            id,
            agentToken,
          },
          previewUrl,
          homespaceUrl,
        ] = await Promise.all([
          getUserForJwt(jwt, { private: true }),
          (async () => {
            console.log('getting agent id...');
            const id = await createAgentGuid({ jwt });
            console.log('got agent id:', id);
            console.log('getting agent token...');
            const agentToken = await getAgentToken(jwt, id);
            console.log('got agent token:', agentToken);
            return {
              id,
              agentToken,
            };
          })(),
          (async () => {
            console.log('uploading agent preview...', { previewBlob });
            const previewUrl = await getCloudPreviewUrl(previewBlob);
            console.log('got agent preview url:', { previewUrl });
            return previewUrl;
          })(),
          (async () => {
            console.log('uploading agent homespace...', { homespaceBlob });
            const homespaceUrl = await getCloudPreviewUrl(homespaceBlob);
            console.log('got agent homespace url:', { homespaceUrl });
            return homespaceUrl;
          })(),
        ]);
        const {
          id: ownerId,
          stripe_connect_account_id: stripeConnectAccountId,
        } = userPrivate;
        let agentJson = {
          id,
          ownerId,
          name: name,
          bio: bio,
          visualDescription: visualDescription,
          previewUrl,
          homespaceUrl,
          stripeConnectAccountId,
        };
        agentJson = ensureAgentJsonDefaults(agentJson);
        const agentJsonString = JSON.stringify(agentJson);

        const mnemonic = generateMnemonic();
        const auth = {
          AGENT_TOKEN: agentToken,
          WALLET_MNEMONIC: mnemonic,
        };
        const envTxt = [
          `AGENT_TOKEN=${JSON.stringify(agentToken)}`,
          `WALLET_MNEMONIC=${JSON.stringify(mnemonic)}`,
        ].join('\n');

        console.log('building agent src...', { monaco, sourceCode });
        const agentTsxFile = new File([sourceCode], 'agent.tsx');
        const agentJsonFile = new File([agentJsonString], 'agent.json');
        const envTxtFile = new File([envTxt], '.env.txt');
        const agentModuleSrc = await buildAgentSrc({
          files: [
            agentTsxFile,
            agentJsonFile,
            envTxtFile,
          ],
        });
        console.log('built agent src', { agentModuleSrc });

        const newWorker = new ReactAgentsWorker({
          agentJson,
          agentModuleSrc,
          auth,
        });
        setWorker(newWorker);

        const newRoom = `rooms:${id}:browser`;
        setRoom(newRoom);
        setConnecting(true);

        // call the join request on the agent
        const agentHost = `${location.protocol}//${location.host}`;
        const joinReq = await newWorker.fetch(`${agentHost}/join`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            room: newRoom,
            only: true,
          }),
        });
        if (joinReq.ok) {
          const j = await joinReq.json();
          console.log('agent join response json', j);
        } else {
          const text = await joinReq.text();
          console.error('agent failed to join room', joinReq.status, text);
        }
      } else {
        throw new Error('not logged in');
      }
    } finally {
      setStarting(false);
    }
  }
  const stopAgent = () => {
    if (worker) {
      worker.terminate();
      setWorker(null);
    }
    if (room) {
      setRoom('');
    }
  };
  const toggleAgent = async () => {
    if (!worker) {
      await startAgent();
    } else {
      stopAgent();
    }
  };
  const ensureAgentInterview = () => {
    if (!agentInterviewPromiseRef.current) {
      agentInterviewPromiseRef.current = (async () => {
        const jwt = await getJWT();

        const agentJson = {};
        const agentInterview = new AgentInterview({
          agentJson,
          mode: 'manual',
          jwt,
        });
        agentInterview.addEventListener('input', (e: any) => {
          const {
            question,
          } = e.data;
          setBuilderMessages((builderMessages) => [
            ...builderMessages,
            {
              role: 'assistant',
              content: question,
            },
          ]);
        });
        agentInterview.addEventListener('output', (e: any) => {
          const {
            text,
          } = e.data;
          setBuilderMessages((builderMessages) => [
            ...builderMessages,
            {
              role: 'assistant',
              content: text,
            },
          ]);
        });
        agentInterview.addEventListener('change', (e: any) => {
          const {
            // updateObject,
            agentJson,
          } = e.data;
          setName(agentJson.name);
          setBio(agentJson.bio);
          setVisualDescription(agentJson.visualDescription);
          setHomespaceDescription(agentJson.homespaceDescription);
          setFeatures(agentJson.features);
        });
        agentInterview.addEventListener('preview', (e: any) => {
          const {
            result,
            signal,
          } = e.data;
          console.log('got preview data', e.data);
          setPreviewBlob(result);
        });
        agentInterview.addEventListener('finish', (e: any) => {
          // clean up
          agentInterviewPromiseRef.current = null;
        });
        return agentInterview;
      })();
    }
    return agentInterviewPromiseRef.current;
  };
  const builderSubmit = () => {
    builderForm.current?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  };

  const gridClass = 'border-2 relative cursor-pointer text-gray-900 p-4 hover:shadow-lg col-span-6 md:col-span-2 lg:col-span-3';
  const expandedClass = 'bg-gray-900 text-white';
  const inputClass = 'w-60 -mt-2 px-4 py-2 bg-[#E4E8EF] border-2 border-[#475461] text-gray-900 text-sm w-full mb-4';
  const textareaClass = 'w-full px-4 py-2 bg-[#E4E8EF] border-2 border-[#475461] text-gray-900 text-sm mb-2 resize-none';
  // render
  return (
    <div className='w-full h-full text-zinc-950'>

      <div className="container mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Build your agent</h1>
        <p className="text-lg text-gray-800 mb-4">
          Select the features you want to enable for your agent.
        </p>
        <div className="grid grid-cols-1 gap-6">

          <div
            className={`${gridClass} ${isPersonalityExpanded ? `col-span-12 ${expandedClass}` : 'col-span-6 md:col-span-4 lg:col-span-3'}`}
            onClick={() => !isPersonalityExpanded && setIsPersonalityExpanded(true)}
          >
            <div className='absolute top-2 right-2'>
              {isPersonalityExpanded && (
                <CloseButton onClick={() => setIsPersonalityExpanded(false)} />
              )}
            </div>
            <h2 className="text-lg font-bold mb-2">Personality <span className="text-sm text-gray-500">(default)</span></h2>
            <div>
              {isPersonalityExpanded ? (
                <div>
                  <input type="text" className={inputClass} value={name} placeholder="Name" onChange={e => setName(e.target.value)} />
                  <input type="text" className={inputClass} value={bio} placeholder="Bio" onChange={e => setBio(e.target.value)} />
                  <div className="flex items-center mb-4">
                    {previewUrl ? (
                      <Link href={previewUrl} target="_blank">
                        <div
                          className='w-28 h-28 min-w-28 mr-4 bg-primary/10 rounded'
                          style={{ backgroundImage: `url(${previewUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                        />
                      </Link>
                    ) : (
                      <div
                        className='w-28 h-28 min-w-28 mr-4 bg-primary/10 rounded'
                        style={{ backgroundSize: 'cover', backgroundPosition: 'center' }}
                      />
                    )}
                    <textarea
                      className={textareaClass}
                      value={visualDescription}
                      placeholder="Visual description"
                      onChange={e => setVisualDescription(e.target.value)}
                    />
                    <Button
                      onClick={e => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (visualDescription) {
                          (async () => {
                            const jwt = await getJWT();
                            const result = await generateCharacterImage(visualDescription, undefined, { jwt });
                            setPreviewBlob(result.blob);
                          })();
                        }
                      }}
                      className="ml-2"
                    >
                      Generate Avatar
                    </Button>
                  </div>
                  <div className="flex items-center mb-4">
                    {homespaceUrl ? (
                      <Link href={homespaceUrl} target="_blank">
                        <div
                          className='w-28 h-28 min-w-28 mr-4 bg-primary/10 rounded'
                          style={{ backgroundImage: `url(${homespaceUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                        />
                      </Link>
                    ) : (
                      <div
                        className='w-28 h-28 min-w-28 mr-4 bg-primary/10 rounded'
                        style={{ backgroundSize: 'cover', backgroundPosition: 'center' }}
                      />
                    )}
                    <div>
                      <textarea
                        className={textareaClass}
                        value={homespaceDescription}
                        placeholder="Homespace description"
                        onChange={e => setHomespaceDescription(e.target.value)}
                      />
                      <Button
                        onClick={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          if (homespaceDescription) {
                            (async () => {
                              const jwt = await getJWT();
                              const result = await generateBackgroundImage(homespaceDescription, undefined, { jwt });
                              setHomespaceBlob(result.blob);
                            })();
                          }
                        }}
                        className="w-full"
                      >
                        Generate Homespace
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div>Customize your agents personality, including visuals.</div>
              )}
            </div>
          </div>
          <div
            className={`${gridClass} ${isVoiceExpanded ? `col-span-12 ${expandedClass}` : 'col-span-6 md:col-span-4 lg:col-span-3'}`}
            onClick={() => !isVoiceExpanded && setIsVoiceExpanded(true)}
          >
            <div className='absolute top-2 right-2'>
              {isVoiceExpanded && (
                <CloseButton onClick={() => setIsVoiceExpanded(false)} />
              )}
            </div>
            <h2 className="text-lg font-bold mb-2">Voice (TTS) <span className="text-sm text-gray-500">(default)</span></h2>
            <div>
              {isVoiceExpanded ? (
                <div>
                  <select
                    className={inputClass}
                    value={features.tts?.voiceEndpoint ?? ''}
                    onChange={e => {
                      setFeatures(features => (
                        {
                          ...features,
                          tts: {
                            voiceEndpoint: e.target.value,
                          },
                        }
                      ));
                    }}
                  >
                    {voices.map(voice => {
                      return (
                        <option key={voice.voiceEndpoint} value={voice.voiceEndpoint}>{voice.name}</option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div>Convert text to speech with customizable voice options.</div>
              )}
            </div>
          </div>
          <div
            className={`${gridClass} ${isRateLimitExpanded ? `col-span-12 ${expandedClass}` : 'col-span-6 md:col-span-4 lg:col-span-3'}`}
            onClick={() => {
              setIsRateLimitExpanded(true);
              !isRateLimitExpanded && setFeatures({
                ...features,
                rateLimit: makeDefaultRateLimit(),
              });
            }}
          >
            <div className='absolute top-2 right-2'>
              {isRateLimitExpanded && (
                <CloseButton onClick={() => {
                  setIsRateLimitExpanded(false);
                  setFeatures({
                    ...features,
                    rateLimit: null,
                  });
                }} />
              )}
            </div>
            <h2 className="text-lg font-bold mb-2">Rate Limit</h2>
            <div>
              {isRateLimitExpanded ? (
                <div>
                  {features.rateLimit && <div className="flex flex-col">
                    <label className="flex">
                      <div className="mr-2 min-w-32"># messages</div>
                      <input type="number" value={features.rateLimit?.maxUserMessages ?? ''} onChange={e => {
                        setFeatures(features => {
                          features = {
                            ...features,
                            rateLimit: {
                              maxUserMessages: parseInt(e.target.value, 10) || 0,
                              maxUserMessagesTime: features.rateLimit?.maxUserMessagesTime ?? 0,
                              message: features.rateLimit?.message ?? rateLimitMessageDefault,
                            },
                          };
                          e.target.value = (features.rateLimit as any).maxUserMessages + '';
                          return features;
                        });
                      }} min={0} step={1} placeholder={maxUserMessagesDefault + ''} />
                    </label>
                    <label className="flex">
                      <div className="mr-2 min-w-32">time (ms)</div>
                      <input type="number" value={features.rateLimit?.maxUserMessagesTime ?? ''} onChange={e => {
                        setFeatures(features => {
                          features = {
                            ...features,
                            rateLimit: {
                              maxUserMessages: features.rateLimit?.maxUserMessages ?? 0,
                              maxUserMessagesTime: parseInt(e.target.value, 10) || 0,
                              message: features.rateLimit?.message ?? rateLimitMessageDefault,
                            },
                          };
                          e.target.value = (features.rateLimit as any).maxUserMessagesTime + '';
                          return features;
                        });
                      }} min={0} step={1} placeholder={maxUserMessagesTimeDefault + ''} />
                    </label>
                    <label className="flex">
                      <div className="mr-2 min-w-32">message</div>
                      <input type="text" value={features.rateLimit?.message ?? ''} onChange={e => {
                        setFeatures(features => (
                          {
                            ...features,
                            rateLimit: {
                              maxUserMessages: features.rateLimit?.maxUserMessages ?? 0,
                              maxUserMessagesTime: features.rateLimit?.maxUserMessagesTime ?? 0,
                              message: e.target.value,
                            },
                          }
                        ));
                      }} placeholder="Rate limit message" />
                    </label>
                  </div>}
                </div>
              ) : (
                <div>Control message frequency to prevent spam and ensure fair usage.</div>
              )}
            </div>
          </div>
          <div
            className={`${gridClass} ${isDiscordExpanded ? `col-span-12 ${expandedClass}` : 'col-span-6 md:col-span-4 lg:col-span-3'}`}
            onClick={() => !isDiscordExpanded && setIsDiscordExpanded(true)}
          >
            <div className='absolute top-2 right-2'>
              {isDiscordExpanded && (
                <CloseButton onClick={() => setIsDiscordExpanded(false)} />
              )}
            </div>
            <h2 className="text-lg font-bold mb-2">Discord</h2>
            <div>
              {isDiscordExpanded ? (
                <div></div>
              ) : (
                <div>Integrate with Discord to enable agent interactions in channels.</div>
              )}
            </div>
          </div>
          <div
            className={`${gridClass} ${isTwitterExpanded ? `col-span-12 ${expandedClass}` : 'col-span-6 md:col-span-4 lg:col-span-3'}`}
            onClick={() => !isTwitterExpanded && setIsTwitterExpanded(true)}
          >
            <div className='absolute top-2 right-2'>
              {isTwitterExpanded && (
                <CloseButton onClick={() => setIsTwitterExpanded(false)} />
              )}
            </div>
            <h2 className="text-lg font-bold mb-2">Twitter</h2>
            <div>
              {isTwitterExpanded ? (
                <div></div>
              ) : (
                <div>Enable your agent to post and interact on Twitter automatically.</div>
              )}
            </div>
          </div>
          <div
            className={`${gridClass} ${isStoreExpanded ? `col-span-12 ${expandedClass}` : 'col-span-6 md:col-span-4 lg:col-span-3'}`}
            onClick={() => !isStoreExpanded && setIsStoreExpanded(true)}
          >
            <div className='absolute top-2 right-2'>
              {isStoreExpanded && (
                <CloseButton onClick={() => setIsStoreExpanded(false)} />
              )}
            </div>
            <h2 className="text-lg font-bold mb-2">Store</h2>
            <div>
              {isStoreExpanded ? (
                <div></div>
              ) : (
                <div>Define items for sale, including subscriptions and one-time purchases.</div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};
