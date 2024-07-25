'use client';

import * as React from 'react';
import {
  cn,
  getAgentEndpointUrl,
  getAgentPreviewImageUrl,
  getAgentUrl,
} from '@/lib/utils';

import { buttonVariants } from '@/components/ui/button';
import Icon from '../ui/icon';
import { Input } from '../ui/input';
import Link from 'next/link';
import { Tooltip, TooltipContent, TooltipTrigger } from '../ui/tooltip';
import { useMultiplayerActions } from '@/components/ui/multiplayer-actions';

interface ChatHistoryProps {
  id: string
}

export function ChatHistory({ id }: ChatHistoryProps) {
  const [showRoomLinkTooltip, setShowRoomLinkTooltip] = React.useState(false)

  const { localPlayerSpec, playersMap, getCrdtDoc } = useMultiplayerActions()

  const crdt = getCrdtDoc()

  const roomName = crdt?.getText('name').toString()
  const roomDescription = crdt?.getText('description').toString()

  const roomLink = typeof window !== 'undefined' ? window.location.href : ''

  const players = Array.from(playersMap.values()).sort((a, b) => {
    return a.getPlayerSpec().name.localeCompare(b.getPlayerSpec().name)
  })

  const [memberSearchQuery, setMemberSearchQuery] = React.useState('')

  const filteredPlayers = players.filter(
    player =>
      player
        .getPlayerSpec()
        .name.toLocaleLowerCase()
        .includes(memberSearchQuery.toLocaleLowerCase()) ||
      memberSearchQuery
        .toLocaleLowerCase()
        .includes(player.getPlayerSpec().name.toLocaleLowerCase())
  );

  return (
    <div className="flex flex-col h-full">
      <div className="flex mt-20 flex-col justify-start px-4 pb-4 gap-1 rounded-md border-1">
        {roomName && (
          <span className="select-none font-black text-2xl flex justify-between w-full items-center">
            {roomName}
          </span>
        )}
        {roomDescription && (
          <span className="select-none text-sm font-medium flex justify-between w-full items-center">
            {roomDescription}
          </span>
        )}

        {(roomName || roomDescription) && (
          <hr className="mb-8 mt-4 opacity-70 " />
        )}

        <span className="select-none opacity-70 text-xs font-medium flex justify-between w-full items-center">
          Chat joining link
        </span>
        <Tooltip open={showRoomLinkTooltip}>
          <TooltipTrigger>
            <span
              onClick={() => {
                navigator.clipboard.writeText(roomLink)
                setShowRoomLinkTooltip(true)
                setTimeout(() => setShowRoomLinkTooltip(false), 1500)
              }}
              className="text-sm overflow-hidden text-ellipsis line-clamp-1"
            >
              {roomLink}
            </span>
          </TooltipTrigger>
          <TooltipContent className="z-50">Copied chat link!</TooltipContent>
        </Tooltip>
      </div>

      <hr className="mb-8 mt-4 opacity-70 mx-2 " />

      <div className="w-full h-fit px-2">
        <Input
          name="search-names"
          placeholder={'Search for members...'}
          value={memberSearchQuery}
          onChange={e => setMemberSearchQuery(e.target.value)}
          type="search"
        />
      </div>
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <h4 className="select-none opacity-70 text-xs font-medium">
          Members ({players.length})
        </h4>
      </div>
      {filteredPlayers.length ? (
        filteredPlayers.map(player => {
          const playerSpec = player.getPlayerSpec();
          const id = playerSpec.id;
          const name = playerSpec.name;
          const agentUrl = getAgentUrl(playerSpec);
          const photo = getAgentPreviewImageUrl(playerSpec);
          return (
            <div className="mb-1 px-2" key={player.playerId}>
              <Link
                href={agentUrl}
                target="_blank"
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'flex w-full justify-start bg-zinc-50 px-2 shadow-none transition-colors hover:bg-zinc-200/40 dark:bg-zinc-900 dark:hover:bg-zinc-300/10'
                )}
              >
                <img
                  className="w-6 h-6 aspect-square rounded-full mr-2"
                  src={photo}
                />
                <div className="flex-1 text-ellipsis overflow-hidden">
                  {name}
                </div>
                {localPlayerSpec.id !== id && (
                  <div
                    className="rounded p-1 hover:bg-zinc-600"
                    onClick={async e => {
                      e.preventDefault()
                      e.stopPropagation()

                      const agentEndpointUrl = getAgentEndpointUrl(playerSpec)
                      const leaveUrl = `${agentEndpointUrl}leave`
                      const res = await fetch(leaveUrl, {
                        method: 'POST'
                      })
                      if (res.ok) {
                        const text = await res.text()
                      }
                    }}
                  >
                    <Icon name="close" className="stroke-2" />
                  </div>
                )}
              </Link>
            </div>
          );
        })
      ) : (
        <span className="px-4 py-2 text-center opacity-70">No results.</span>
      )}
    </div>
  );
}
