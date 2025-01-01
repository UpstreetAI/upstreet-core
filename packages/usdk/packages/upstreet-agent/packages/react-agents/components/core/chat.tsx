import React from 'react';
import dedent from 'dedent';
import { z } from 'zod';
import { Action } from './action';
import { PendingActionEvent } from '../../types/react-agents';

export const ChatActions = () => {
  return (
    <>
      <Action
        type="say"
        description={dedent`\
          Say something in the chat.

          If you want to mention a player, use the @name format.
        `}
        schema={
          z.object({
            text: z.string(),
          })
        }
        examples={[
          {
            text: 'Hello, there! How are you doing?',
          },
        ]}
        // handler={async (e: PendingActionEvent) => {
        //   await e.commit();
        // }}
      />
      <Action
        type="messageReaction"
        description={dedent`\
          React to a message sent by another user with an emoji when you want to:
          - Use the "id" of a message to react to a specific message
          - Show agreement or disagreement with the message content
          - Express appreciation for helpful or insightful messages
          - Acknowledge someone's feelings or emotions
          - Show support or encouragement
          
          Use appropriate reactions that match the context and tone of the message.
        `}
        schema={
          z.object({
            reaction: z.string(),
            id: z.string(),
          })
        }
        examples={[
          {
            reaction: '👍',
            id: '123',
          },
          {
            reaction: '👎',
            id: '123',
          },
        ]}
        handler={async (e: PendingActionEvent) => {
          await e.commit();
        }}
      />
    </>
  );
};