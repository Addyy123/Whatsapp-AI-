import { AgentRequest, AgentResponse } from './types';
import { AgentPersistence } from './persistence';
import { ContextBuilder } from './context';
import { Planner } from './planner';
import { AuthError } from '../errors/types';

export class AgentOrchestrator {
  constructor(
    private persistence: AgentPersistence,
    private contextBuilder: ContextBuilder,
    private planner: Planner
  ) {}

  async run(request: AgentRequest): Promise<AgentResponse> {
    const startedAt = Date.now();

    // 1. Idempotency Check
    const cached = await this.persistence.getRunByRequestId(request.request_id);
    if (cached) return cached.response;

    // 2. Auth Check
    const agent = await this.persistence.getAgent(request.agent_id);
    if (!agent || agent.owner_id !== request.user_id) throw new AuthError();

    const config = await this.persistence.getAgentConfig(agent.id);
    if (!config) throw new Error('Agent configuration not found');

    // 3. Conversation & Message Logging
    const conversation = await this.persistence.ensureConversation(request);
    await this.persistence.saveMessage({
      conversation_id: conversation.id,
      role: 'user',
      content: request.message
    });

    // 4. Context Assembly
    const context = await this.contextBuilder.build(agent, config, conversation, request);

    // 5. Create Run Record
    const runId = await this.persistence.createRun(request);

    try {
      // 6. Planner execution (the LLM loop)
      const plannerResult = await this.planner.run(context, agent, config);

      // 7. Save Assistant Reply
      await this.persistence.saveMessage({
        conversation_id: conversation.id,
        role: 'assistant',
        content: plannerResult.reply
      });

      // 8. Finalize Run
      await this.persistence.finalizeRun(runId, {
        status: plannerResult.status,
        output_reply: plannerResult.reply,
        tool_calls: JSON.stringify(plannerResult.toolCallLog),
        actions: JSON.stringify(plannerResult.actions),
        duration_ms: Date.now() - startedAt
      });

      return {
        run_id: runId,
        status: plannerResult.status,
        reply: plannerResult.reply,
        actions: plannerResult.actions,
      };
    } catch (err: any) {
      await this.persistence.failRun(runId, err);
      throw err;
    }
  }
}
