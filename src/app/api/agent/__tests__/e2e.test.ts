import { describe, it, expect, beforeAll } from 'vitest';
import { AgentOrchestrator } from '@/lib/agent/orchestrator';
import { AgentPersistence } from '@/lib/agent/persistence';
import { ContextBuilder } from '@/lib/agent/context';
import { Planner } from '@/lib/agent/planner';
import { ToolExecutor } from '@/lib/agent/executor';
import { PolicyEngine } from '@/lib/agent/policy';
import { AuditService } from '@/lib/audit/service';
import { MemoryService } from '@/lib/memory/service';
import { TaskService } from '@/lib/tasks/service';
import { AutomationService } from '@/lib/automation/service';
import { GroqProvider } from '@/lib/llm/groq';
import { ToolRegistry } from '@/lib/tools/registry';
import { sql } from '@/lib/db/client';
import '@/lib/tools/memory';
import '@/lib/tools/tasks';
import '@/lib/tools/automation';
import '@/lib/tools/search';

describe('E2E Agent Run', () => {
  const TEST_AGENT_ID = '5549808b-82b6-47bc-ac6d-c0f3210f887d';
  const TEST_USER_ID = '148d2021-cd42-4ff5-8eaf-c5cdb9af8aa9';
  
  let orchestrator: AgentOrchestrator;

  beforeAll(async () => {
    // Setup test agent config in DB
    await sql`
      INSERT INTO agent_configs (agent_id, response_style, timezone, locale, autonomy_level, enabled_tools)
      VALUES (${TEST_AGENT_ID}, 'concise', 'UTC', 'en', 3, '{"memory.save","task.create","web.search"}')
      ON CONFLICT (agent_id) DO NOTHING
    `;

    const persistence = new AgentPersistence();
    const memoryService = new MemoryService();
    const taskService = new TaskService();
    const automationService = new AutomationService();
    const contextBuilder = new ContextBuilder(persistence, memoryService, taskService, automationService);
    const groq = new GroqProvider(process.env.GROQ_API_KEY!);
    const registry = new ToolRegistry();
    const policyEngine = new PolicyEngine();
    const auditService = new AuditService();
    const executor = new ToolExecutor(registry, policyEngine, auditService);

    const planner = new Planner(groq, executor);

    orchestrator = new AgentOrchestrator(persistence, contextBuilder, planner);
  });

  it('should process a basic conversation and return a reply', async () => {
    const request = {
      agent_id: TEST_AGENT_ID,
      user_id: TEST_USER_ID,
      message: 'Hello Alice, who are you?',
      source: 'api' as const,
      request_id: `test-req-${Date.now()}`
    };

    const response = await orchestrator.run(request);
    
    expect(response.status).toBe('completed');
    expect(response.reply).toBeTruthy();
    expect(response.reply.length).toBeGreaterThan(5);
  });

  it('should be idempotent if the same request_id is sent twice', async () => {
    const reqId = `test-idem-${Date.now()}`;
    const request = {
      agent_id: TEST_AGENT_ID,
      user_id: TEST_USER_ID,
      message: 'What is 2+2?',
      source: 'api' as const,
      request_id: reqId
    };

    const firstResponse = await orchestrator.run(request);
    const secondResponse = await orchestrator.run(request);

    expect(firstResponse.reply).toEqual(secondResponse.reply);
    expect(firstResponse.run_id).toEqual(secondResponse.run_id);
  });
});
