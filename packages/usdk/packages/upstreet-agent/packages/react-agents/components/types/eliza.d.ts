export type IAgentRuntime = {};
export type State = {};
export type Options = {};
export type Memory = {
  user: string;
  content: any;
};

export type IActionHandlerAttachment = {
  id: string;
  url: string;
  // title: "Generated 3D",
  // source: "ThreeDGeneration",
  // description: ThreeDPrompt,
  // text: ThreeDPrompt,
};
export type IActionHandlerCallbackArgs = {
  text: string;
  error?: boolean;
  attachments?: IActionHandlerAttachment[],
};
export type HandlerFn = (
  runtime: IAgentRuntime,
  message: Memory,
  state: State,
  options: Options,
  callback: (result: IActionHandlerCallbackArgs) => void,
) => void;
export type ValidateFn = (
  runtime: IAgentRuntime,
  message: Memory,
) => Promise<boolean>;
export type IAction = {
  name: string;
  // similies?: string[];
  description: string;
  examples: Memory[][];
  validate: ValidateFn,
  handler: HandlerFn;
};

export type IEvaluator = {
  name: string;
    // similes?: string[],
    alwaysRun?: boolean,
    validate: ValidateFn,
    description: string,
    handler: HandlerFn,
    examples: {
      context: string;
      message: Memory[];
    }[],
};

export type IProvider = {
  get: (
    runtime: IAgentRuntime,
    message: Memory,
    state?: State
  ) => Promise<string | null>;
};

export type IPlugin = {
  actions: IAction[];
  evaluators: IEvaluator[];
  providers: IProvider[];
};

export type Database = {};

export type IAdapter = (database: Database) => void;

export type IRuntime = {
  getSetting: (key: string) => string;
};

export type Client = {
  start: (runtime: IRuntime) => any;
  stop: (runtime: IRuntime) => void;
};