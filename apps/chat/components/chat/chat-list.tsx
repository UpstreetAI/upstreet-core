import { Separator } from '@/components/ui/separator';

export interface ChatListProps {
  messages: { id: string; display: string }[];
}

export function ChatList({ messages }: ChatListProps) {
  if (!messages.length) {
    return null;
  }

  return (
    <>
      {messages.map((message, index) => (
        <div key={message.id}>
          {message.display}
        </div>
      ))}
    </>
  );
}
