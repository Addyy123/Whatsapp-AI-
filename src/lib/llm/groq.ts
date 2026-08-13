import Groq from 'groq-sdk';
import { LLMProvider } from './provider';
import { ChatMessage, ToolSchema, LLMResponse, StreamChunk, ChatOptions } from './types';
import { LLMTimeoutError, ContextLengthError } from '../errors/types';

export class GroqProvider implements LLMProvider {
  readonly name = 'groq';
  readonly model: string;
  private client: Groq;

  constructor(apiKey: string, model: string = 'llama-3.3-70b-versatile') {
    this.model = model;
    this.client = new Groq({ apiKey });
  }

  async chat(
    messages: ChatMessage[],
    tools?: ToolSchema[],
    options?: ChatOptions
  ): Promise<LLMResponse> {
    const formattedMessages = messages.map(msg => {
      // Groq SDK mapping
      if (msg.role === 'tool') {
        return {
          role: 'tool' as const,
          content: msg.content,
          tool_call_id: msg.tool_call_id!
        };
      }
      const baseMsg: any = {
        role: msg.role,
        content: msg.content,
      };
      if (msg.name) {
        baseMsg.name = msg.name;
      }
      return baseMsg;
    });

    try {
      const response = await this.client.chat.completions.create({
        messages: formattedMessages as any,
        model: this.model,
        tools: tools && tools.length > 0 ? tools : undefined,
        tool_choice: tools && tools.length > 0 ? 'auto' : undefined,
        max_tokens: options?.max_tokens,
        temperature: options?.temperature,
      }, { timeout: options?.timeout_ms ?? 30000 });

      const choice = response.choices[0];
      const message = choice.message;

      // Handle Tool Calls
      if (message.tool_calls && message.tool_calls.length > 0) {
        return {
          type: 'tool_calls',
          tool_calls: message.tool_calls.map(tc => ({
            id: tc.id,
            name: tc.function.name,
            arguments: JSON.parse(tc.function.arguments || '{}')
          })),
          tokens_in: response.usage?.prompt_tokens ?? 0,
          tokens_out: response.usage?.completion_tokens ?? 0,
          finish_reason: 'tool_calls'
        };
      }

      // Handle Standard Answer
      return {
        type: 'answer',
        content: message.content || '',
        tokens_in: response.usage?.prompt_tokens ?? 0,
        tokens_out: response.usage?.completion_tokens ?? 0,
        finish_reason: choice.finish_reason === 'length' ? 'length' : 'stop'
      };

    } catch (error: any) {
      if (error?.status === 400 && error?.error?.message?.toLowerCase().includes('context length')) {
        throw new ContextLengthError();
      }
      if (error?.name === 'APITimeoutError' || error?.code === 'ETIMEDOUT') {
        throw new LLMTimeoutError();
      }
      throw error;
    }
  }

  async *stream(
    messages: ChatMessage[],
    options?: ChatOptions
  ): AsyncGenerator<StreamChunk> {
    // For Dev UI streaming later
    const formattedMessages = messages.map(msg => {
      const baseMsg: any = {
        role: msg.role === 'tool' ? 'tool' as const : msg.role,
        content: msg.content,
        tool_call_id: msg.tool_call_id
      };
      if (msg.name) {
        baseMsg.name = msg.name;
      }
      return baseMsg;
    });

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages: formattedMessages as any,
      stream: true,
      max_tokens: options?.max_tokens,
      temperature: options?.temperature,
    });

    for await (const chunk of stream) {
      yield {
        delta: chunk.choices[0]?.delta?.content || '',
        done: chunk.choices[0]?.finish_reason != null
      };
    }
  }
}
