import { Agent, AgentConfig, ActionRecord, ConfirmationRequest } from './types';
import { BuiltContext } from './context';
import { LLMProvider } from '../llm/provider';
import { ChatMessage, LLMToolCall } from '../llm/types';
import { ToolExecutor } from './executor';

export class Planner {
  constructor(
    private llm: LLMProvider,
    private executor: ToolExecutor
  ) {}

  async run(context: BuiltContext, agent: Agent, config: AgentConfig) {
    const maxIterations = (config.model_policy as any)?.max_iterations ?? 10;
    let iterations = 0;
    
    const messages: ChatMessage[] = [...context.messages];
    const actions: ActionRecord[] = [];
    const toolCallLog: any[] = [];

    while (iterations < maxIterations) {
      iterations++;
      
      const response = await this.llm.chat(messages, context.tools);
      
      if (response.type === 'answer') {
        return {
          status: 'completed' as const,
          reply: response.content || '',
          actions,
          toolCallLog,
        };
      }
      
      if (response.type === 'tool_calls' && response.tool_calls) {
        toolCallLog.push(...response.tool_calls);
        
        // Push the assistant's tool call request into the message history
        messages.push({
          role: 'assistant',
          content: '', // required by Groq
        });

        // Execute the tools
        const { results, actions: newActions } = await this.executor.executeAll(
          response.tool_calls,
          agent,
          config
        );
        
        actions.push(...newActions);

        // Feed results back into history for next LLM turn
        for (const res of results) {
          messages.push({
            role: 'tool',
            content: res.error ? `Error: ${res.error}` : res.content,
            tool_call_id: res.tool_call_id,
            name: res.name
          });
        }
      }
    }

    return {
      status: 'completed' as const,
      reply: "I've thought for too long and need to stop.",
      actions,
      toolCallLog,
    };
  }
}
