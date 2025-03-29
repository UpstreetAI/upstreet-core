export * from "./types.ts";
export * from "./context.ts";
export * from "./generation.ts";
export * from "./memory.ts";
export * from "./parsing.ts";
export * from "./embedding.ts";
export * from "./uuid.ts";
export { default as knowledge } from "./knowledge.ts";
export * from "./models.ts";
export * from "./messages.ts";
export * from "./goals.ts";

export const elizaLogger = console;
export const settings = {
  SOL_ADDRESS: 'So11111111111111111111111111111111111111112',
  SLIPPAGE: '1',
};

export const Action = {};
export const HandlerCallback = {};
export const IAgentRuntime = {};
export const Memory = {};
export const Plugin = {};
export const State = {};