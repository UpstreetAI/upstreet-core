import * as React from 'react';
import { PromptForm } from '@/components/prompt-form';
import { DirectMessages } from '@/components/direct-message-form';
import { ButtonScrollToBottom } from '@/components/button-scroll-to-bottom';
import { useSidebar } from '@/lib/client/hooks/use-sidebar';

export interface ChatPanelProps {
  // id?: string
  title?: string
  input: string
  setInput: (value: string) => void
  isAtBottom: boolean
  scrollToBottom: () => void
  room?: string
  desktop?: boolean
  messages: Array<{ id: string; display: React.ReactNode }>
  // sendChatMessage: (message: string) => void
}

export function ChatPanel({
  // id,
  title,
  input,
  setInput,
  isAtBottom,
  scrollToBottom,
  room,
  desktop,
  messages,
  // sendChatMessage,
}: ChatPanelProps) {

  const { isLeftSidebarOpen, isRightSidebarOpen } = useSidebar();

  return (
    <div className={`absolute inset-x-0 bottom-0 w-full duration-300 ease-in-out animate-in ${isLeftSidebarOpen ? "lg:pl-[250px] xl:pl-[300px]" : ""} ${isRightSidebarOpen ? "lg:pr-[250px] xl:pr-[300px]" : ""}`}>
      
      <ButtonScrollToBottom
        isAtBottom={isAtBottom}
        scrollToBottom={scrollToBottom}
      />

      <div className="relative mx-auto border-t bg-gray-300 sm:px-4">
        {room && (<>

          <div className="space-y-4 px-4 py-2 sm:max-w-2xl mx-auto md:py-3 relative">
            <PromptForm
              input={input}
              setInput={setInput}
              desktop={desktop}
            />
          </div>

          <DirectMessages />
        </>)}
      </div>
    </div>
  );
}
