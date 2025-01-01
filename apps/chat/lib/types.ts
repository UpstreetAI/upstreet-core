import { CoreMessage } from 'ai'
import { StoreItem } from 'react-agents/types';

export type Message = CoreMessage & {
  id: string
}

export interface GlobalState {
  isDevMode: boolean;
  mode: any | null;
}

export interface Chat extends Record<string, any> {
  id: string
  title: string
  createdAt: Date
  userId: string
  path: string
  messages: Message[]
  sharePath?: string
}

export type ServerActionResult<Result> = Promise<
  | Result
  | {
      error: string
    }
>

export interface Session {
  user: {
    id: string
    email: string
  }
}

export interface AuthResult {
  type: string
  message: string
}

export interface User extends Record<string, any> {
  id: string
  email: string
  password: string
  salt: string
}


export type ChatMessage = {
  role: string;
  content: string;
};

export type FeaturesObject = {
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

export type AgentEditorProps = {
  user: any;
};
