import { toolRegistry } from './registry';
import { MemoryService } from '../memory/service';

const memoryService = new MemoryService();

toolRegistry.register({
  name: 'memory.save',
  schema: {
    type: 'function',
    function: {
      name: 'memory.save',
      description: 'Save an explicit fact, preference, or detail about the user that you should remember for future conversations.',
      parameters: {
        type: 'object',
        properties: {
          content: { type: 'string', description: 'The fact or preference to remember' },
          category: { type: 'string', description: 'Optional category (e.g. preference, fact, contact, schedule)' }
        },
        required: ['content']
      }
    }
  },
  handler: async (args: any, context) => {
    const id = await memoryService.saveMemory(
      context.agent_id, 
      context.user_id, 
      args.content, 
      args.category
    );
    return { success: true, id, message: 'Memory saved successfully.' };
  }
});

toolRegistry.register({
  name: 'memory.search',
  schema: {
    type: 'function',
    function: {
      name: 'memory.search',
      description: 'Search the user\'s past memories for specific facts or details.',
      parameters: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search term or keywords' }
        },
        required: ['query']
      }
    }
  },
  handler: async (args: any, context) => {
    const memories = await memoryService.searchMemories(context.agent_id, context.user_id, args.query);
    return { success: true, memories };
  }
});

toolRegistry.register({
  name: 'memory.forget',
  schema: {
    type: 'function',
    function: {
      name: 'memory.forget',
      description: 'Delete a specific memory by ID if it is no longer relevant or the user asks to forget it.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The ID of the memory to delete' }
        },
        required: ['id']
      }
    }
  },
  handler: async (args: any, context) => {
    const success = await memoryService.forgetMemory(args.id, context.agent_id, context.user_id);
    if (!success) throw new Error('Memory not found or you do not have permission to delete it.');
    return { success: true, message: 'Memory deleted.' };
  }
});

// Import this file anywhere to ensure tools are registered
export {};
