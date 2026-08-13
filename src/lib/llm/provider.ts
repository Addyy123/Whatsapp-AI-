import { ChatMessage, ToolSchema, LLMResponse, ChatOptions, StreamChunk } from './types';

export interface LLMProvider {
  readonly name: string;
  readonly model: string;

  chat(
    messages: ChatMessage[],
    tools?: ToolSchema[],
    options?: ChatOptions
  ): Promise<LLMResponse>;

  stream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk>;
}

export interface LLMProviderFactory {
  create(config: Record<string, unknown>): LLMProvider;
}
