import { describe, it, expect } from 'vitest';
import { PolicyEngine } from '@/lib/agent/policy';
import { AgentConfig } from '@/lib/agent/types';
import { ToolSchema } from '@/lib/llm/types';

describe('Policy Engine', () => {
  const engine = new PolicyEngine();

  const mockAgent: AgentConfig = {
    id: 'test-agent',
    agent_id: 'test-agent-123',
    response_style: 'helpful',
    timezone: 'UTC',
    locale: 'en',
    autonomy_level: 0,
    enabled_tools: ['automation.delete', 'web.search', 'memory.forget'],
    confirmation_policy: {},
    allowed_recipients: [],
    model_policy: {},
    memory_policy: {},
    automation_policy: {}
  };

  it('should block a high-risk tool for autonomy level 0', () => {
    expect(() => {
      engine.validateToolExecution('memory.forget', mockAgent);
    }).toThrow('autonomy level');
  });

  it('should allow a low-risk tool for autonomy level 1', () => {
    mockAgent.autonomy_level = 1;
    expect(() => {
      engine.validateToolExecution('web.search', mockAgent);
    }).not.toThrow();
  });
});
