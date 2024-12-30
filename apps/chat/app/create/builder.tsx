'use client';

import { useState, useRef, useMemo, useEffect } from 'react';
import Link from 'next/link';
import Editor, { useMonaco } from '@monaco-editor/react';
import { Button, Icon, IconButton } from 'ucom';
import { deployEndpointUrl, r2EndpointUrl } from '@/utils/const/endpoints';
import { getJWT } from '@/lib/jwt';
import { getUserForJwt } from '@/utils/supabase/supabase-client';
import type { StoreItem, SubscriptionProps, Currency, Interval } from 'react-agents/types';
import { createAgentGuid } from 'react-agents/util/guid-util.mjs';
import { getAgentToken } from 'react-agents/util/jwt-utils.mjs';
import { generateMnemonic } from '../../utils/etherium-utils.mjs';
import { Chat } from '@/components/chat/chat';
import { cn } from '@/lib/utils';
import { ensureAgentJsonDefaults } from 'react-agents/util/agent-json-util.mjs';
import { generateCharacterImage, generateBackgroundImage } from 'react-agents/util/generate-image.mjs';
import { AgentInterview } from 'react-agents/util/agent-interview.mjs';
import { defaultVoices } from 'react-agents/util/agent-features-spec.mjs';
import { makeAnonymousClient } from '@/utils/supabase/supabase-client';
import { env } from '@/lib/env';
import defaultAgentSourceCode from 'react-agents/util/agent-default.mjs';
import { currencies, intervals } from 'react-agents/constants.mjs';
import { buildAgentSrc } from 'react-agents-builder';
import { ReactAgentsWorker } from 'react-agents-browser';
import type { FetchableWorker } from 'react-agents-browser/types';
import { BackButton } from '@/components/back';
import { Modal } from './modal';
import Progress from './progress';

import { featureSpecs } from 'react-agents/util/agent-features-spec.mjs';

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
  personality: {
    name: string;
    bio: string;
    visualDescription: string;
    homespaceDescription: string;
  } | null;
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

export default function AgentEditor({
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

  const [isPersonalityExpanded, setIsPersonalityExpanded] = useState(false);

  const [voices, setVoices] = useState(() => defaultVoices.slice());
  const [features, setFeatures] = useState<FeaturesObject>({
    personality: null,
    tts: null,
    rateLimit: null,
    storeItems: null,
    discord: null,
    twitterBot: null,
  });
  const [sourceCode, setSourceCode] = useState(defaultAgentSourceCode);

  const monaco = useMonaco();

  const [isAssistantVisible, setIsAssistantVisible] = useState(false);
  const [isCodeVisible, setIsCodeVisible] = useState(false);
  const [isChatVisible, setIsChatVisible] = useState(false);

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
    console.log('jwt', jwt);
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
          name,
          bio,
          visualDescription,
          previewUrl,
          homespaceUrl,
          stripeConnectAccountId,
        };
        agentJson = ensureAgentJsonDefaults(agentJson);
        const agentJsonString = JSON.stringify(agentJson);

        const mnemonic = generateMnemonic();
        const env = {
          AGENT_TOKEN: agentToken,
          WALLET_MNEMONIC: mnemonic,
        };
        const envTxt = [
          `AGENT_TOKEN=${JSON.stringify(agentToken)}`,
          `WALLET_MNEMONIC=${JSON.stringify(mnemonic)}`,
        ].join('\n');

        // console.log('building agent src...', { monaco, sourceCode });
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
        // console.log('built agent src', { agentModuleSrc });

        console.log('start worker', {
          agentJson,
          agentModuleSrc,
          env,
        });
        const newWorker = new ReactAgentsWorker({
          agentJson,
          agentModuleSrc,
          env,
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
    console.log('builder submit', builderForm.current);
    builderForm.current?.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  };

  useEffect(() => {
    if (name || bio || visualDescription || homespaceDescription) {
      setIsPersonalityExpanded(true);
    }
  }, [name, bio, visualDescription, homespaceDescription]);

  // Create a reusable CloseButton component
  const CloseButton = ({ onClick }: { onClick: (e: React.MouseEvent) => void }) => (
    <button
      className="text-gray-300 hover:text-gray-600 text-2xl"
      onClick={(e) => {
        e.stopPropagation();
        onClick(e);
      }}
    >
      ✕
    </button>
  );

  const inputClass = 'w-60 px-4 py-2 bg-[#E4E8EF] border-2 border-[#475461] text-gray-900 text-sm w-full mb-2';
  const textareaClass = 'w-full px-4 py-2 bg-[#E4E8EF] border-2 border-[#475461] text-gray-900 text-sm mb-2 resize-none';


  const featureWrapperClass = 'bg-gradient-to-t from-[#6AA6EB] to-[#0E468A] hover:from-[#003A82] hover:to-[#003A82] p-[2px] cursor-pointer relative inline-block text-center border w-full md:w-[calc(33.333%-1rem)] sm:w-[calc(50%-1rem)] lg:w-[calc(25%-1rem)] m-2 transition-colors duration-300';
  const featureClass = 'bg-[#000C19] px-4 py-6 text-[#85B0E5] hover:bg-[#003A82] transition-colors duration-300';
  const featureClassActive = 'bg-[#0155BC]';
  const featureClassInDevelopment = 'opacity-50 hover:opacity-80';
  const featureIconClass = 'size-10 mx-auto';
  const featureTextClass = 'pt-4 text-sm font-medium capitalize font-body lg:text-lg md:text-base md:pt-2';

  const [modalOpen, setModalOpen] = useState<string | null>(null);
  const [step, setStep] = useState(1);

  const enablePersonality = () => {
    setModalOpen('personality');
    setIsPersonalityExpanded(true);
  };

  const disablePersonality = (e: React.MouseEvent) => {
    e.stopPropagation();
    setName('');
    setBio('');
    setVisualDescription('');
    setHomespaceDescription('');
    setIsPersonalityExpanded(false);
    setModalOpen(null);
  };


  useEffect(() => {
    if (step === 1) {
      if (worker) {
        stopAgent();
      }
    }
    if (step === 2) {
      if (!worker && monaco && user) {
        startAgent();
      }
    }
  }, [worker, monaco, user, step]);

  // Add Feature
  const addFeature = (featureType: keyof FeaturesObject, defaultValue: any) => {
    setFeatures((prevFeatures) => ({
      ...prevFeatures,
      [featureType]: defaultValue,
    }));
  };

  // Remove Feature
  const removeFeature = (featureType: keyof FeaturesObject, e: React.MouseEvent) => {
    e.stopPropagation();
    setFeatures((prevFeatures) => ({
      ...prevFeatures,
      [featureType]: null,
    }));
  };


  console.log('featureSpecs', featureSpecs);

  // render
  return (
    <div className="relative">
      <div className='w-full h-screen text-zinc-950 bg-[url("/images/backgrounds/builder-background.jpg")] bg-center bg-cover'>
        <div className="flex h-full overflow-y-auto">
          <div className="container mx-auto max-w-4xl px-4 py-8 text-gray-100">

            <h1 className="text-4xl font-bold mb-4 text-center mt-8">Create Agent</h1>

            <p className="text-lg mb-8 text-center">
              Build and deploy your agent in 3 steps.
            </p>

            <div className='mx-auto max-w-xl mb-4'>
              <Progress
                currentStep={step}
                steps={
                  [
                    {
                      title: 'Build',
                      Icon: 'Tiling',
                      description: 'Customize your agents personality',
                    },
                    {
                      title: 'Test',
                      Icon: 'Head',
                      description: 'Test your agent',
                    },
                    {
                      title: 'Deploy',
                      Icon: 'Upload',
                      description: 'Deploy your agent',
                    },
                  ]
                }
              />
            </div>

            <div>

              {/* STEP 1 */}

              <div className={cn('flex flex-row h-full', step !== 1 && 'hidden')}>

                <form className="w-full relative" ref={editorForm} onSubmit={e => {
                  e.preventDefault();

                  // check if the form is validated
                  const valid = builderForm.current?.checkValidity();
                  if (valid) {
                    (async () => {
                      try {
                        setDeploying(true);

                        // get the value from monaco editor
                        const value = getEditorValue();
                        console.log('deploy 1', {
                          name,
                          bio,
                          visualDescription,
                          previewBlob,
                          value,
                        });

                        const jwt = await getJWT();
                        if (jwt) {
                          const [
                            userPrivate,
                            id,
                            previewUrl,
                            homespaceUrl,
                          ] = await Promise.all([
                            getUserForJwt(jwt, { private: true }),
                            createAgentGuid({ jwt }),
                            getCloudPreviewUrl(previewBlob),
                            getCloudPreviewUrl(homespaceBlob),
                          ]);
                          const {
                            id: ownerId,
                            stripe_connect_account_id: stripeConnectAccountId,
                          } = userPrivate;

                          // agent.json
                          let agentJson = {
                            id,
                            ownerId,
                            name,
                            bio,
                            visualDescription,
                            previewUrl,
                            homespaceUrl,
                            stripeConnectAccountId,
                          };
                          agentJson = ensureAgentJsonDefaults(agentJson);
                          console.log('deploy 2', {
                            agentJson,
                          });
                          const agentJsonString = JSON.stringify(agentJson, null, 2);
                          const agentJsonFile = new File([agentJsonString], 'agent.json');

                          // .env.txt
                          const mnemonic = generateMnemonic();
                          const envTxt = [
                            `AGENT_TOKEN=${JSON.stringify(jwt)}`,
                            `WALLET_MNEMONIC=${JSON.stringify(mnemonic)}`,
                          ].join('\n');
                          const envTxtFile = new File([envTxt], '.env.txt');

                          // agent.tsx
                          const agentTsxFile = new File([sourceCode], 'agent.tsx');

                          const files = [
                            agentJsonFile,
                            envTxtFile,
                            agentTsxFile,
                          ];
                          const formData = new FormData();
                          files.forEach(file => {
                            formData.append(file.name, file);
                          });

                          const res = await fetch(`${deployEndpointUrl}/agent`, {
                            method: 'PUT',
                            headers: {
                              Authorization: `Bearer ${jwt}`,
                            },
                            body: formData,
                          });
                          if (res.ok) {
                            const j = await res.json();
                            console.log('deploy 3', j);
                            // const agentJsonOutputString = j.vars.AGENT_JSON;
                            // const agentJsonOutput = JSON.parse(agentJsonOutputString);
                            // const guid = agentJsonOutput.id;
                            // location.href = `/agents/${guid}`;
                          } else {
                            const text = await res.text();
                            console.error('failed to deploy agent', res.status, text);
                          }
                        } else {
                          throw new Error('not logged in');
                        }
                      } finally {
                        setDeploying(false);
                      }
                    })();
                  }
                }}>

                  <div className='text-lg font-bold flex flex-row items-center justify-center mb-4'><Icon icon="Tiling" className='size-5 mr-2' /> <h2>Select Features</h2></div>

                  <div className="flex flex-wrap justify-center w-full mb-8">


                    <div className={featureWrapperClass}>
                      <div
                        onClick={enablePersonality}
                        className={cn(featureClass, isPersonalityExpanded ? featureClassActive : '')}
                      >
                        <div>
                          <Icon
                            icon="Close"
                            className={cn('size-5 text-white cursor-pointer absolute top-2 right-2', !isPersonalityExpanded && 'hidden')}
                            onClick={disablePersonality}
                          />
                          <Icon icon="Head" className={featureIconClass} />
                          <p className={featureTextClass}>
                            Personality
                          </p>
                          {/* modal */}
                          <Modal
                            icon="Head"
                            title="Personality"
                            description="Customize your agents personality, including visuals."
                            open={modalOpen === 'personality'}
                            close={() => setModalOpen(null)}
                            disableFeature={() => {
                              setName('');
                              setBio('');
                              setVisualDescription('');
                              setHomespaceDescription('');
                              setIsPersonalityExpanded(false);
                              setModalOpen(null);
                            }}
                          >
                            <div className="mt-4">
                              <label>
                                <span className="mb-2">Name</span>
                                <input type="text" className={inputClass} value={name} placeholder="Give your agent a name" onChange={e => (e.target.value)} />
                              </label>
                              <label>
                                <span className="mb-2">Bio</span>
                                <input type="text" className={inputClass} value={bio} placeholder="Describe your agent's personality" onChange={e => setBio(e.target.value)} />
                              </label>
                              <div className="flex items-center mb-4 mt-4">
                                {previewUrl ? (
                                  <Link href={previewUrl} target="_blank">
                                    <div
                                      className='w-28 h-28 min-w-28 mr-4 bg-zinc-300'
                                      style={{ backgroundImage: `url(${previewUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                                    />
                                  </Link>
                                ) : (
                                  <div
                                    className='w-28 h-28 min-w-28 mr-4 bg-zinc-300'
                                    style={{ backgroundSize: 'cover', backgroundPosition: 'center' }}
                                  />
                                )}
                                <div className="w-full">
                                  <textarea
                                    className={textareaClass}
                                    value={visualDescription}
                                    placeholder="Describe your agent's appearance"
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
                                    className="w-full"
                                  >
                                    {previewUrl ? 'ReGenerate' : 'Generate'} Agent Avatar
                                  </Button>
                                </div>
                              </div>
                              <div className="flex items-center mb-4">
                                {homespaceUrl ? (
                                  <Link href={homespaceUrl} target="_blank">
                                    <div
                                      className='w-28 h-28 min-w-28 mr-4 bg-zinc-300'
                                      style={{ backgroundImage: `url(${homespaceUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                                    />
                                  </Link>
                                ) : (
                                  <div
                                    className='w-28 h-28 min-w-28 mr-4 bg-zinc-300'
                                    style={{ backgroundSize: 'cover', backgroundPosition: 'center' }}
                                  />
                                )}
                                <div className="w-full">
                                  <textarea
                                    className={textareaClass}
                                    value={homespaceDescription}
                                    placeholder="Describe your agent's home space and environment"
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
                                    {homespaceUrl ? 'Re-generate' : 'Generate'} Agent Homespace
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </Modal>
                        </div>
                      </div>
                    </div>


                    <div className={featureWrapperClass}>
                      <div
                        onClick={() => {
                          setModalOpen('voice');
                          addFeature('tts', makeDefaultTts());
                        }}
                        className={cn(featureClass, features.tts ? featureClassActive : '')}
                      >
                        <div>
                          <Icon
                            icon="Close"
                            className={cn('size-5 text-white cursor-pointer absolute top-2 right-2', !features.tts && 'hidden')}
                            onClick={(e) => removeFeature('tts', e)}
                          />
                          <Icon icon="Voice" className={featureIconClass} />
                          <p className={featureTextClass}>
                            Voice
                          </p>
                          {features.tts && (
                            <Modal
                              icon="Voice"
                              title="Voice"
                              description="Select a voice for your agent"
                              open={modalOpen === 'voice'}
                              close={() => setModalOpen(null)}
                              disableFeature={() => {
                                setFeatures({
                                  ...features,
                                  tts: null,
                                });
                              }}
                            >
                              <div className="w-full">
                                <label>
                                  <span className="mb-2 text-gray-900">Selected voice:</span>
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
                                </label>
                              </div>
                            </Modal>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={featureWrapperClass}>
                      <div onClick={() => {
                        setModalOpen('rateLimit');
                        !features.rateLimit && setFeatures({
                          ...features,
                          rateLimit: makeDefaultRateLimit(),
                        });
                      }} className={cn(featureClass, features.rateLimit ? featureClassActive : '')}>
                        <div>
                          <Icon
                            icon="Close"
                            className={cn('size-5 text-white cursor-pointer absolute top-2 right-2', !features.rateLimit && 'hidden')}
                            onClick={(e) => removeFeature('rateLimit', e)}
                          />
                          <Icon icon="Chat" className={featureIconClass} />
                          <p className={featureTextClass}>
                            Rate Limit
                          </p>
                          {features.rateLimit && (
                            <Modal
                              icon="Chat"
                              title="Rate Limit"
                              description="Control message frequency to prevent spam and ensure fair usage."
                              open={modalOpen === 'rateLimit'}
                              close={() => setModalOpen(null)}
                              disableFeature={() => {
                                setFeatures({
                                  ...features,
                                  rateLimit: null,
                                });
                              }}
                            >
                              <div>
                                <div className="flex flex-col">
                                  <label className="text-gray-900">
                                    <div className="mr-2 min-w-32">Max Messages</div>
                                    <input type="number" className={inputClass} value={features.rateLimit?.maxUserMessages ?? ''} onChange={e => {
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
                                  <label className="text-gray-900">
                                    <div className="mr-2 min-w-32">Time Frame (ms)</div>
                                    <input type="number" className={inputClass} value={features.rateLimit?.maxUserMessagesTime ?? ''} onChange={e => {
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
                                  <label className="text-gray-900">
                                    <div className="mr-2 min-w-32">Limit Exceeded Message</div>
                                    <input type="text" className={inputClass} value={features.rateLimit?.message ?? ''} onChange={e => {
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
                                </div>
                              </div>
                            </Modal>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={featureWrapperClass}>
                      <div onClick={() => {
                        setModalOpen('discord');
                        !features.discord && setFeatures({
                          ...features,
                          discord: makeDefaultDiscord(),
                        });
                      }} className={cn(featureClass, features.discord ? featureClassActive : '')}>
                        <div>
                          <Icon
                            icon="Close"
                            className={cn('size-5 text-white cursor-pointer absolute top-2 right-2', !features.discord && 'hidden')}
                            onClick={(e) => removeFeature('discord', e)}
                          />
                          <Icon icon="Discord" className={featureIconClass} />
                          <p className={featureTextClass}>
                            Discord
                          </p>
                          {features.discord && (
                            <Modal
                              icon="Discord"
                              title="Discord"
                              description="Integrate your agent with discord to enable interactions in your discord server channels."
                              open={modalOpen === 'discord'}
                              close={() => setModalOpen(null)}
                              disableFeature={() => {
                                setFeatures({
                                  ...features,
                                  discord: null,
                                });
                              }}
                            >
                              <div>
                                <div className="flex flex-col">
                                  {/* token */}
                                  <label className="text-gray-900">
                                    <div className="mr-2 min-w-32">Bot Token</div>
                                    <input type="text" className={inputClass} value={features.discord.token} onChange={e => {
                                      setFeatures(features => ({
                                        ...features,
                                        discord: {
                                          token: e.target.value,
                                          channels: features.discord?.channels ?? '',
                                        },
                                      }));
                                    }} placeholder="<bot token>" required />
                                  </label>
                                  {/* channels */}
                                  <label className="text-gray-900">
                                    <div className="mr-2 min-w-32">Channels</div>
                                    <input type="text" className={inputClass} value={features.discord.channels} onChange={e => {
                                      setFeatures(features => ({
                                        ...features,
                                        discord: {
                                          token: features.discord?.token ?? '',
                                          channels: e.target.value,
                                        },
                                      }));
                                    }} placeholder="text, voice" required />
                                  </label>
                                </div>
                              </div>
                            </Modal>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={featureWrapperClass}>
                      <div onClick={() => {
                        setModalOpen('twitterBot');
                        !features.twitterBot && setFeatures({
                          ...features,
                          twitterBot: makeDefaultTwitterBot(),
                        });
                      }} className={cn(featureClass, features.twitterBot ? featureClassActive : '')}>
                        <div>
                          <Icon
                            icon="Close"
                            className={cn('size-5 text-white cursor-pointer absolute top-2 right-2', !features.twitterBot && 'hidden')}
                            onClick={(e) => removeFeature('twitterBot', e)}
                          />
                          <Icon icon="X" className={featureIconClass} />
                          <p className={featureTextClass}>
                            X (Twitter)
                          </p>
                          {features.twitterBot && (
                            <Modal
                              icon="X"
                              title="X (Twitter)"
                              description="Enable your agent to post and interact on Twitter automatically."
                              open={modalOpen === 'twitterBot'}
                              close={() => setModalOpen(null)}
                              disableFeature={() => {
                                setFeatures({
                                  ...features,
                                  twitterBot: null,
                                });
                              }}
                            >
                              <div>
                                <div className="flex flex-col">
                                  <label className="text-gray-900">
                                    <div className="mr-2 min-w-32">Token</div>
                                    <input type="text" className={inputClass} value={features.twitterBot.token} onChange={e => {
                                      setFeatures(features => ({
                                        ...features,
                                        twitterBot: {
                                          token: e.target.value,
                                        },
                                      }));
                                    }} placeholder="<bot token>" required />
                                  </label>
                                </div>
                              </div>
                            </Modal>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className={featureWrapperClass}>
                      <div onClick={() => {
                        setModalOpen('storeItems');
                        !features.storeItems && setFeatures({
                          ...features,
                          storeItems: makeEmptyStoreItems(),
                        });
                      }} className={cn(featureClass, features.storeItems ? featureClassActive : '')}>
                        <div>
                          <Icon
                            icon="Close"
                            className={cn('size-5 text-white cursor-pointer absolute top-2 right-2', !features.storeItems && 'hidden')}
                            onClick={(e) => removeFeature('storeItems', e)}
                          />
                          <Icon icon="ModuleStore" className={featureIconClass} />
                          <p className={featureTextClass}>
                            Store
                          </p>
                          {features.storeItems && (
                            <Modal
                              icon="ModuleStore"
                              title="Store"
                              description="Define items for sale, including subscriptions and one-time purchases."
                              open={modalOpen === 'storeItems'}
                              close={() => setModalOpen(null)}
                              disableFeature={() => {
                                setFeatures({
                                  ...features,
                                  storeItems: null,
                                });
                              }}
                            >
                              <div>
                                <div className="flex flex-col">
                                  {features.storeItems.map((item, index) => {
                                    const {
                                      type,
                                      props,
                                    } = item;
                                    const setStoreItem = (fn: (storeItem: StoreItem) => void) => {
                                      setFeatures(features => {
                                        const storeItems = features.storeItems ?? [];
                                        const newStoreItems = [...storeItems];
                                        const newStoreItem = { ...item };
                                        fn(newStoreItem);
                                        newStoreItems[index] = newStoreItem;
                                        return {
                                          ...features,
                                          storeItems: newStoreItems,
                                        };
                                      });
                                    };
                                    return (
                                      <div className="flex" key={index}>
                                        {props.previewUrl ?
                                          <img
                                            src={props.previewUrl}
                                            className="w-16 h-16 mr-2 bg-primary/10 rounded"
                                          />
                                          :
                                          <div
                                            className="w-16 h-16 mr-2 bg-primary/10 rounded"
                                          />
                                        }
                                        <div className="flex flex-col">
                                          <select value={type} className={inputClass} onChange={e => {
                                            setStoreItem((storeItem) => {
                                              storeItem.type = e.target.value;
                                            });
                                          }}>
                                            <option value="payment">payment</option>
                                            <option value="subscription">subscription</option>
                                          </select>
                                          <input type="text" className={inputClass} value={props.name} onChange={e => {
                                            setStoreItem((storeItem) => {
                                              storeItem.props.name = e.target.value;
                                            });
                                          }} placeholder="Name" />
                                          <input type="text" className={inputClass} value={props.description} onChange={e => {
                                            setStoreItem((storeItem) => {
                                              storeItem.props.description = e.target.value;
                                            });
                                          }} placeholder="Description" />
                                          <input type="number" className={inputClass} value={props.amount} onChange={e => {
                                            setStoreItem((storeItem) => {
                                              storeItem.props.amount = parseFloat(e.target.value);
                                            });
                                          }} placeholder="Amount" />
                                          <select className={inputClass} value={props.currency} onChange={e => {
                                            setStoreItem((storeItem) => {
                                              storeItem.props.currency = e.target.value as Currency;
                                            });
                                          }}>
                                            {currencies.map(currency => {
                                              return (
                                                <option value={currency} key={currency}>{currency}</option>
                                              );
                                            })}
                                          </select>
                                          {type === 'subscription' && <>
                                            {/* interval */}
                                            <select className={inputClass} value={(props as SubscriptionProps).interval} onChange={e => {
                                              setStoreItem((storeItem) => {
                                                (storeItem.props as SubscriptionProps).interval = e.target.value as Interval;
                                              });
                                            }}>
                                              <option value="day">day</option>
                                              <option value="week">week</option>
                                              <option value="month">month</option>
                                              <option value="year">year</option>
                                            </select>
                                            {/* intervalCount */}
                                            <input type="number" className={inputClass} value={(props as SubscriptionProps).intervalCount} onChange={e => {
                                              setStoreItem((storeItem) => {
                                                (storeItem.props as SubscriptionProps).intervalCount = parseFloat(e.target.value);
                                              });
                                            }} placeholder="Interval count" />
                                          </>}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            </Modal>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className='w-full h-px bg-zinc-200 my-8' />
                    
                    {/* ACTIVE FEATURES (featureSpec.active === true) */}

                    {featureSpecs
                      .filter(featureSpec => featureSpec.active)
                      .map((featureSpec) => {
                        const { name, default: defaultValues, displayName, displayDescription, displayIcon } = featureSpec;

                        return (
                          <div className={featureWrapperClass} key={name}>
                            <div
                              onClick={() => {
                                setModalOpen(name);
                                addFeature(name as keyof FeaturesObject, defaultValues);
                              }}
                              className={cn(featureClass, features[name] ? featureClassActive : '')}
                            >
                              <div>
                                <Icon
                                  icon="Close"
                                  className={cn('size-5 text-white cursor-pointer absolute top-2 right-2', !features[name] && 'hidden')}
                                  onClick={(e) => removeFeature(name as keyof FeaturesObject, e)}
                                />
                                
                                <Icon icon={displayIcon ?? 'Upstreet'} className={featureIconClass} />
                                
                                <p className={featureTextClass}>
                                  {displayName ?? name}
                                </p>

                                <Modal
                                  icon={displayIcon ?? 'Upstreet'}
                                  title={displayName ?? name}
                                  description={displayDescription}
                                  open={modalOpen === name}
                                  close={() => setModalOpen(null)}
                                  disableFeature={() => {
                                    setFeatures({
                                      ...features,
                                      [name]: null,
                                    });
                                  }}
                                >
                                  <div>
                                    <div className="flex flex-col">
                                      {Object.entries(defaultValues).map(([key, value]) => {
                                        if (typeof value === 'string') {
                                          return (
                                            <label key={key} className="text-gray-900">
                                              <span className="mb-2">{key}</span>
                                              <input
                                                type="text"
                                                className={inputClass}
                                                value={features[name]?.[key] ?? ''}
                                                onChange={(e) => {
                                                  setFeatures((prevFeatures) => ({
                                                    ...prevFeatures,
                                                    [name]: {
                                                      ...prevFeatures[name],
                                                      [key]: e.target.value,
                                                    },
                                                  }));
                                                }}
                                              />
                                            </label>
                                          );
                                        } else if (typeof value === 'number') {
                                          return (
                                            <label key={key} className="text-gray-900">
                                              <span className="mb-2">{key}</span>
                                              <input
                                                type="number"
                                                className={inputClass}
                                                value={features[name]?.[key] ?? ''}
                                                onChange={(e) => {
                                                  setFeatures((prevFeatures) => ({
                                                    ...prevFeatures,
                                                    [name]: {
                                                      ...prevFeatures[name],
                                                      [key]: parseFloat(e.target.value),
                                                    },
                                                  }));
                                                }}
                                              />
                                            </label>
                                          );
                                        } else if (Array.isArray(value)) {
                                          return (
                                            <label key={key} className="text-gray-900">
                                              <span className="mb-2">{key}</span>
                                              <select
                                                className={inputClass}
                                                value={features[name]?.[key] ?? ''}
                                                onChange={(e) => {
                                                  setFeatures((prevFeatures) => ({
                                                    ...prevFeatures,
                                                    [name]: {
                                                      ...prevFeatures[name],
                                                      [key]: e.target.value,
                                                    },
                                                  }));
                                                }}
                                              >
                                                {value.map((option) => (
                                                  <option key={option} value={option}>
                                                    {option}
                                                  </option>
                                                ))}
                                              </select>
                                            </label>
                                          );
                                        }
                                        return null;
                                      })}
                                    </div>
                                  </div>
                                </Modal>

                              </div>
                            </div>
                          </div>
                        );
                      })}

                    {/* INACTIVE FEATURES ( In development, featureSpec.active === false) */}

                    {featureSpecs
                      .filter(featureSpec => !featureSpec.active)
                      .map((featureSpec) => {
                        return (
                          <div className={cn(featureWrapperClass, featureClassInDevelopment)} key={featureSpec.name}>
                            <div
                              className={cn(featureClass)}
                            >
                              <div>
                                <Icon icon={'Lock'} className={featureIconClass} />
                                <p className={featureTextClass}>
                                  {featureSpec.displayName ?? featureSpec.name}
                                </p>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                  </div>
                </form>
              </div>

              {/* STEP 2 */}

              <div className={cn('flex flex-row h-full items-center justify-center my-8', step !== 2 && 'hidden')}>
                <div className={`w-[400px]`}>

                  <div className='text-lg font-bold flex flex-row items-center justify-center mb-4'><Icon icon="Chat" className='size-5 mr-2' /> <h2>Test Agent</h2></div>
                  <div className='h-[408px] w-full relative'>
                    <Chat
                      room={room}
                      mode={'builder'}
                      onConnect={(connected) => {
                        if (connected) {
                          setConnecting(false);
                        }
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* STEP 3 */}

              <div className={cn('flex flex-row h-full', step !== 3 && 'hidden')}>

              </div>

              <div className='flex flex-row justify-center mt-8 absolute bottom-8 left-8 right-8'>
                {step === 1 && (
                  <Button variant='secondary' className='p-2' size='large' onClick={() => setStep(step + 1)}>Next</Button>
                )}
                {step === 3 && (
                  <Button variant='secondary' className='p-2' size='large' onClick={() => setStep(step - 1)}>Back</Button>
                )}
                {step !== 1 && step !== 3 && (
                  <>
                    <Button variant='secondary' className='p-2 mr-auto' size='large' onClick={() => setStep(step - 1)}>Back</Button>
                    <Button variant='secondary' className='p-2 ml-auto' size='large' onClick={() => setStep(step + 1)}>Next</Button>
                  </>
                )}
              </div>

            </div>

          </div>


          {/* assistant */}

          <div className={`flex-col relative right-4 bottom-4 h-full w-[300px] bg-white ${isAssistantVisible ? '' : 'hidden'}`}>
            <div className="flex flex-col flex-1 h-[calc(100%-40px)] overflow-scroll px-1 pb-8 pt-6">
              {builderMessages.map((message, index) => (
                <div key={index} className={cn('flex gap-2 mb-4 px-4')}>
                  <div className='w-6 min-w-6'><Icon icon={message.role === 'assistant' ? 'Upstreet' : 'Head'} className="size-5" /></div>
                  <div className={message.role === 'assistant' ? '' : ' opacity-70'}>{message.content}</div>
                </div>
              ))}
            </div>
            <div className="flex absolute h-[40px] bg-green-500 bottom-0 left-0 w-full">
              <form
                className="flex w-full"
                onSubmit={async e => {
                  e.preventDefault();
                  e.stopPropagation();

                  if (builderPrompt) {
                    const agentInterview = await ensureAgentInterview();
                    agentInterview.write(builderPrompt);

                    setBuilderMessages((builderMessages) => [
                      ...builderMessages,
                      {
                        role: 'user',
                        content: builderPrompt,
                      },
                    ]);
                    setBuilderPrompt('');
                  }
                }}
                ref={builderForm}
              >
                <div className="relative w-full">
                  <div className="w-full">
                    <input
                      type="text"
                      className={cn(inputClass, 'w-full')}
                      value={builderPrompt}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          builderSubmit();
                        }
                      }}
                      onChange={e => setBuilderPrompt(e.target.value)}
                    />
                  </div>
                  <div className="absolute right-0 top-2 sm:right-2">
                    <Icon icon="Send" className='text-2xl cursor-pointer' onClick={e => {
                      e.preventDefault();
                      builderSubmit();
                    }} />
                  </div>
                </div>
              </form>
            </div>
          </div>




        </div>



        {/* code editor */}

        <div className={`flex-col h-screen w-[30vw] max-w-[30vw] flex-1 relative border-l border-zinc-900 hidden`}>
          <Editor
            theme="vs-dark"
            defaultLanguage="javascript"
            defaultValue={sourceCode}
            options={{
              readOnly: deploying,
            }}
            onMount={(editor, monaco) => {
              (editor as any)._domElement.parentNode.style.flex = 1;

              const model = editor.getModel();
              if (model) {
                model.onDidChangeContent(() => {
                  const s = getEditorValue(monaco);
                  setSourceCode(s);
                });
              } else {
                console.warn('no model', editor);
              }

              editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
                startAgent({
                  sourceCode: getEditorValue(monaco),
                });
              });
            }}
          />
        </div>





      </div>
    </div>
  );
};