'use client'

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { ChatList } from '@/components/chat/chat-list';
import { ChatPanel } from '@/components/chat/chat-panel';
import { useScrollAnchor } from '@/lib/hooks/use-scroll-anchor';
import { getJWT } from '@/lib/jwt';
import { useSupabase, type User } from '@/lib/hooks/use-supabase';
import { PlayerSpec, Player, useMultiplayerActions } from '@/components/ui/multiplayer-actions';
import { Button } from '@/components/ui/button';
import { defaultUserPreviewUrl } from 'react-agents/defaults.mjs';
import { PaymentItem, SubscriptionProps } from 'react-agents/types';
import { createSession } from '@/lib/stripe';
import { webbrowserActionsToText } from 'react-agents/util/browser-action-utils.mjs';
import { currencies, intervals } from 'react-agents/constants.mjs';
import { useLoading } from '@/lib/client/hooks/use-loading';
import { environment } from '@/lib/env';
import { ChatMessageEmbed } from './chat-message-embed';

const openInNewPage = (url: string) => {
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.click();
};

type Alt = {
  q: string;
  a: string;
};

type FormattedAttachment = {
  id: string;
  type: string;
  alt?: Alt[];
};

type Attachment = FormattedAttachment & {
  url?: string;
};

type Message = {
  method: string;
  args: {
    text?: string;
  };
  attachments: Attachment[];
  name: string;
  timestamp: Date;
  userId: string;
  human: boolean;
};

export interface ChatProps extends React.ComponentProps<'div'> {
  room: string;
}

type AgentData = {
  id: string;
  name: string;
};

async function getAgentData(supabase: any, identifier: string) {
  try {
    // Find by ID
    let result = await supabase
      .from('assets')
      .select('*, author: accounts ( id, name ), embed: embed_agent ( trusted_urls )')
      .eq('id', identifier)
      .single();

    // If not found by ID, try username
    if (!result.data) {
      result = await supabase
        .from('assets')
        .select('*, author: accounts ( id, name ), embed: embed_agent ( trusted_urls )')
        .eq('name', identifier)
        .single();
    }

    return result;
  } catch (error) {
    console.error('Error fetching agent data:', error);
    throw error;
  }
}

export function DesktopChat({ className, room }: ChatProps) {
  const [input, setInput] = useState('');
  const [agents, setAgents] = useState<AgentData[]>([]);
  const { user, supabase } = useSupabase();

  const {
    playersCache,
    messages: rawMessages,
    setMultiplayerConnectionParameters,
    // agentJoinRoom,
  } = useMultiplayerActions();

  const playerIds = Array.from(playersCache.keys());
  useEffect(() => {
    let live = true;
    (async () => {
      const agentsDataPromises = playerIds.map(async (playerId) => {
        const player = playersCache.get(playerId);
        const playerSpec = player!.getPlayerSpec();
        const capabilities = playerSpec.capabilities ?? [];

        if (!capabilities.includes('human')) {
          return playerSpec as AgentData;
        } else {
          return null;
        }
      });
      let agentsData = (await Promise.all(agentsDataPromises)) as AgentData[];
      agentsData = agentsData.filter(Boolean);
      if (!live) return;

      console.log('agents data', agentsData);

      setAgents(agentsData);
    })();
    return () => {
      live = false;
    };
  }, [
    playerIds.join(','),
  ]);

  useEffect(() => {
    if (room) {
      const localPlayerSpec = {
        id: user?.id,
        name: user?.name,
        previewUrl: user?.preview_url ?? defaultUserPreviewUrl,
      } as PlayerSpec;
      setMultiplayerConnectionParameters({
        room,
        localPlayerSpec,
      });
    } 
  }, [room]);

  const messages = rawMessages.map((rawMessage: any, index: number) => {
    const message = {
      ...rawMessage,
      timestamp: rawMessage.timestamp ? new Date(rawMessage.timestamp) : new Date(),
    };
    return {
      id: index,
      display: getMessageComponent(room, message, index + '', playersCache, user),
    };
  }) as any[];

  const { messagesRef, scrollRef, visibilityRef, isAtBottom, scrollToBottom } = useScrollAnchor();
  const { isAgentLoading } = useLoading();

  return (
    <div className={`relative group w-full duration-300 text-gray-900 ease-in-out animate-in`}>
      <div className='h-screen overflow-auto' ref={scrollRef}>
        <div className={cn('pb-[200px] pt-4', className)} ref={messagesRef}>
          <div className="relative mx-auto px-2">
            {messages.length ? <ChatList messages={messages} /> : null}
          </div>

          <div className="relative mx-auto px-2">
            {isAgentLoading && "Loading agent..."}
          </div>

          <div className="w-full h-px" ref={visibilityRef} />
        </div>
      </div>
      <ChatPanel
        input={input}
        setInput={setInput}
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
        room={room}
        messages={messages}
      />
    </div>
  );
}

function getMessageComponent(room: string, message: Message, id: string, playersCache: Map<string, Player>, user: User | null) {
  switch (message.method) {
    case 'join':
      return (
        <div className="opacity-60 text-center text-white bg-gray-400 border-gray-600 border mt-2 p-1 mx-14">
          <span className='font-bold'>{message.name}</span> joined the room.
        </div>
      );
    case 'leave':
      return (
        <div className="opacity-60 text-center text-white bg-gray-400 border-gray-600 border mt-2 p-1 mx-14">
          <span className='font-bold'>{message.name}</span> left the room.
        </div>
      );
    case 'say': {
      const player = playersCache.get(message.userId);
      const media = (message.attachments ?? []).filter(a => !!a.url)[0] ?? null;
      const isOwnMessage = user && user.id === message.userId || message.userId === 'embed';
      const profileUrl = `/${message.human ? 'accounts' : 'agents'}/${message?.userId}`;

      return (
        <ChatMessageEmbed
          id={id}
          name={message.name}
          content={message.args.text}
          isOwnMessage={isOwnMessage}
          profileUrl={profileUrl}
          media={media}
          player={player}
          room={room}
          timestamp={message.timestamp}
        />
      );
    }
    case 'addMemory':
      return (
        <div className="opacity-60 text-xs">{message.name} will remember that</div>
      );
    case 'queryMemories':
      return (
        <div className="opacity-60 text-xs">{message.name} is trying to remember</div>
      );
    case 'mediaPerception':
      return (
        <div className="opacity-60 text-xs">{message.name} checked an attachment</div>
      );
    case 'browserAction': {
      const player = playersCache.get(message.userId);
      const { method, args, result, error } = message.args as {
        method: string;
        args: any;
        result: any;
        error: any;
      };
      const spec = webbrowserActionsToText.find((spec) => spec.method === method);
      if (spec) {
        const agent = player?.getPlayerSpec();
        const o = { agent, method, args, result, error };
        const text = spec.toText(o);
        return (
          <div className="opacity-60 text-xs">{text}</div>
        );
      } else {
        return null;
      }
    }
    case 'paymentRequest': {
      const agentId = message.userId;
      const player = playersCache.get(agentId);
      const { args } = message;
      const { type, props, stripeConnectAccountId } = args as PaymentItem;
      const { name = '', description = '', amount = 0, currency = currencies[0], interval = intervals[0], intervalCount = 1 } = props as SubscriptionProps;

      const checkout = async (e: any) => {
        if (user) {
          const targetUserId = user.id;
          const jwt = await getJWT();
          if (!jwt) {
            throw new Error('No jwt:' + jwt);
          }

          const success_url = location.href;
          const stripe_connect_account_id = stripeConnectAccountId;
          const opts = {
            args: {
              mode: type,
              line_items: [
                {
                  quantity: 1,
                  price_data: {
                    product_data: {
                      name,
                      description,
                    },
                    unit_amount: amount,
                    currency,
                    recurring: type === 'subscription' ? {
                      interval,
                      interval_count: intervalCount,
                    } : undefined,
                  },
                },
              ],
              success_url,
              metadata: {
                name,
                description,
                targetUserId,
                agentId,
              },
            },
            stripe_connect_account_id,
          };
          const j = await createSession(opts, { environment, jwt });
          const { url } = j;
          openInNewPage(url);
        } else {
          throw new Error('No user:' + user);
        }
      };

      const price = (() => {
        const v = amount / 100;
        return currency === 'usd' ? `$${v}` : `${v} ${(currency + '').toUpperCase()}`;
      })();
      const subscriptionText = type === 'subscription' ? ` per ${interval}${intervalCount !== 1 ? 's' : ''}` : '';

      return (
        <ChatMessageEmbed
          id={id}
          content={
            <div className="rounded bg-zinc-950 text-zinc-300 p-4 border">
              <div className="text-zinc-700 text-sm mb-2 font-bold">[payment request]</div>
              <div className="mb-4">{name}: {description}</div>
              <div className="mb-4">{price}{subscriptionText}</div>
              <Button onClick={checkout}>Checkout</Button>
            </div>
          }
          name={message.name}
          media={null}
          player={player}
          room={room}
          timestamp={message.timestamp}
          isOwnMessage={false}
          profileUrl={''}
        />
      );
    }
    default:
      return null;
  }
}