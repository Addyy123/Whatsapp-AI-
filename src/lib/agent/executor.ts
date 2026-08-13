import { ToolRegistry } from '../tools/registry';
import { LLMToolCall } from '../llm/types';
import { ActionRecord, Agent, AgentConfig } from './types';
import { PolicyEngine } from './policy';
import { AuditService } from '../audit/service';

export class ToolExecutor {
  constructor(private registry: ToolRegistry, private policyEngine: PolicyEngine, private auditService: AuditService) {}

  async executeAll(
    toolCalls: LLMToolCall[], 
    agent: Agent, 
    config: AgentConfig
  ): Promise<{ results: any[], actions: ActionRecord[] }> {
    
    const results: any[] = [];
    const actions: ActionRecord[] = [];

    for (const call of toolCalls) {
      const tool = this.registry.getTool(call.name);

      if (!tool) {
        results.push({
          tool_call_id: call.id,
          name: call.name,
          error: `Tool ${call.name} not found.`
        });
        continue;
      }

      // 1. Validate against Policy Engine
      try {
        this.policyEngine.validateToolExecution(call.name, config);
      } catch (err: any) {
        results.push({
          tool_call_id: call.id,
          name: call.name,
          error: err.message
        });
        continue;
      }

      // 2. Execute tool
      try {
        const handlerResult = await tool.handler(call.arguments, {
          agent_id: agent.id,
          user_id: agent.owner_id
        });

        results.push({
          tool_call_id: call.id,
          name: call.name,
          result: JSON.stringify(handlerResult)
        });

        // 3. Write Audit Log for destructive actions or external connections
        if (call.name !== 'web.search') {
          await this.auditService.logEvent(agent.id, agent.owner_id, call.name, {
            arguments: call.arguments,
            result: handlerResult
          });
        }

        // Record action for audit/UI
        actions.push({
          type: call.name,
          id: handlerResult?.id,
          summary: `Executed ${call.name}`
        });

      } catch (err: any) {
        results.push({
          tool_call_id: call.id,
          name: call.name,
          error: err.message
        });
      }
    }

    return { results, actions };
  }
}
