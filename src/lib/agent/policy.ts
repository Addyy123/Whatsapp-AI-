import { AgentConfig } from './types';
import { PolicyError } from '../errors/types';

export class PolicyEngine {
  validateToolExecution(toolName: string, config: AgentConfig) {
    if (!config.enabled_tools.includes(toolName)) {
      throw new PolicyError(`Tool ${toolName} is not enabled for this agent.`);
    }

    const readOnlyTools = ['task.list', 'memory.search', 'automation.list', 'web.search'];
    const writeTools = ['task.create', 'task.complete', 'memory.save', 'automation.create'];
    const destructiveTools = ['task.cancel', 'memory.forget', 'agent.configure'];

    let requiredLevel = 0;
    if (readOnlyTools.includes(toolName)) requiredLevel = 1;
    if (writeTools.includes(toolName)) requiredLevel = 2;
    if (destructiveTools.includes(toolName)) requiredLevel = 3;

    if (config.autonomy_level < requiredLevel) {
      throw new PolicyError(`Your autonomy level (${config.autonomy_level}) is too low to use ${toolName}. You need level ${requiredLevel}.`);
    }
  }
}
