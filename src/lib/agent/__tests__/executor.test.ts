import { describe, it, expect } from 'vitest';
import { ToolExecutor } from '@/lib/agent/executor';
import { ToolRegistry } from '@/lib/tools/registry';

describe('Tool Executor', () => {
  const registry = new ToolRegistry();
  // Register a mock tool
  registry.register({
    name: 'test.tool',
    description: 'A test tool',
    parameters: { type: 'object', properties: {} },
    risk_level: 'low',
    execute: async (args: any, ctx: any) => ({ success: true, args })
  });

  it('should prevent execution if tool is not registered', async () => {
    const executor = new ToolExecutor(registry, {} as any, {} as any);
    const result = await executor.executeAll([{
      id: 'call_123',
      name: 'non.existent',
      arguments: '{}'
    }], { id: 'test' } as any, { autonomy_level: 3, enabled_tools: ['non.existent'] } as any);

    expect(result.results[0].error).toBeDefined();
    expect(result.results[0].error).toContain('not found');
  });
});
