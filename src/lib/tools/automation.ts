import { toolRegistry } from './registry';
import { AutomationService } from '../automation/service';

const automationService = new AutomationService();

toolRegistry.register({
  name: 'automation.create',
  schema: {
    type: 'function',
    function: {
      name: 'automation.create',
      description: 'Create a background automation/cron job to run periodically (e.g. "Check the news every morning" or "Summarize emails daily").',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'A short name for the automation' },
          prompt: { type: 'string', description: 'Detailed instructions on what you should do when this automation triggers' },
          cron_schedule: { type: 'string', description: 'Standard cron expression (e.g., "0 9 * * *" for 9am daily)' }
        },
        required: ['name', 'prompt', 'cron_schedule']
      }
    }
  },
  handler: async (args: any, context) => {
    const id = await automationService.createAutomation(
      context.agent_id, 
      context.user_id, 
      args.name, 
      args.prompt, 
      args.cron_schedule
    );
    return { success: true, id, message: `Automation "${args.name}" scheduled successfully.` };
  }
});

toolRegistry.register({
  name: 'automation.list',
  schema: {
    type: 'function',
    function: {
      name: 'automation.list',
      description: 'List the user\'s active automations.',
      parameters: {
        type: 'object',
        properties: {}
      }
    }
  },
  handler: async (args: any, context) => {
    const automations = await automationService.listAutomations(context.agent_id, context.user_id);
    return { success: true, count: automations.length, automations };
  }
});

export {};
