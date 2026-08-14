export type MessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface ChatMessage {
  role: MessageRole;
  content: string;
  tool_call_id?: string;
  name?: string;
}

export interface ToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, unknown>; // JSON Schema
  };
}

export type LLMResponseType = 'answer' | 'tool_calls' | 'error';

export interface LLMToolCall {
  id: string;
  name: string;
  arguments: Record<string, unknown>;
}

export interface LLMResponse {
  type: LLMResponseType;
  content?: string;
  tool_calls?: LLMToolCall[];
  tokens_in: number;
  tokens_out: number;
  finish_reason: 'stop' | 'tool_calls' | 'length' | 'error';
}

export interface StreamChunk {
  delta: string;
  done: boolean;
}

export interface ChatOptions {
  max_tokens?: number;
  temperature?: number;
  timeout_ms?: number;
}
