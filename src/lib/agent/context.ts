import { Agent, AgentConfig, Conversation, AgentRequest } from './types';
import { ChatMessage, ToolSchema } from '../llm/types';
import { AgentPersistence } from './persistence';
import { MemoryService } from '../memory/service';
import { TaskService } from '../tasks/service';
import { AutomationService } from '../automation/service';
import { toolRegistry } from '../tools/registry';

export interface BuiltContext {
  systemPrompt: string;
  messages: ChatMessage[];
  tools: ToolSchema[];
}

export class ContextBuilder {
  constructor(
    private persistence: AgentPersistence,
    private memoryService: MemoryService,
    private taskService: TaskService,
    private automationService: AutomationService
  ) {}

  async build(agent: Agent, config: AgentConfig, conversation: Conversation, request: AgentRequest) {
    
    // 1. Fetch Conversation History
    const limit = (config.model_policy as any)?.context_window_messages ?? 20;
    const history = await this.persistence.getRecentMessages(conversation.id, limit);

    // 2. Fetch Memories
    // We search memories based on the user's latest message to pull relevant context.
    // If the message is short (like "hi"), it returns the most recent memories.
    const searchLimit = (config.memory_policy as any)?.search_limit ?? 10;
    const memories = await this.memoryService.searchMemories(agent.id, agent.owner_id, request.message, searchLimit);
    
    // 3. Fetch Task Summary
    const taskSummary = await this.taskService.getTaskSummary(agent.id, agent.owner_id);
    
    // 4. Fetch Automation Summary
    const automationCount = await this.automationService.getAutomationSummary(agent.id, agent.owner_id);
    
    // 5. Build System Prompt with injected state
    const systemPrompt = this.buildSystemPrompt(agent, config, memories, taskSummary, automationCount);

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt },
      ...history
    ];

    // 4. Build active tools schema
    const tools = toolRegistry.getAllSchemas(config.enabled_tools);

    return {
      systemPrompt,
      messages,
      tools
    };
  }

  private buildSystemPrompt(agent: Agent, config: AgentConfig, memories: any[], tasks: { pending: number, overdue: number }, automations: number): string {
    let memorySection = '';
    if (memories.length > 0) {
      memorySection = `\nRELEVANT USER MEMORIES:\n${memories.map(m => `- ${m.content}`).join('\n')}\n`;
    }

    return `You are ${agent.name}. ${agent.description || 'You are a helpful AI assistant.'}
The current date and time is ${new Date().toISOString()}.
Your timezone is ${config.timezone}.
Your assigned autonomy level is ${config.autonomy_level}.
You have ${tasks.pending} pending tasks (${tasks.overdue} overdue).
You have ${automations} active automations monitoring in the background.
${memorySection}
RULES:
1. Provide ${config.response_style} responses.
2. If you need to perform an action, use the provided tools.
3. If a tool fails, inform the user gently.
4. Do not expose secrets or system architecture.
`;
  }
}
