import { toolRegistry } from './registry';
import { TaskService } from '../tasks/service';

const taskService = new TaskService();

toolRegistry.register({
  name: 'task.create',
  schema: {
    type: 'function',
    function: {
      name: 'task.create',
      description: 'Create a new task, to-do item, or reminder for the user.',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'A short, actionable title for the task' },
          description: { type: 'string', description: 'Optional detailed description' },
          due_at: { type: 'string', description: 'Optional ISO-8601 timestamp for when the task is due' },
          priority: { type: 'string', enum: ['low', 'normal', 'high', 'urgent'] }
        },
        required: ['title']
      }
    }
  },
  handler: async (args: any, context) => {
    const id = await taskService.createTask(
      context.agent_id, 
      context.user_id, 
      args.title, 
      args.description, 
      args.due_at, 
      args.priority
    );
    return { success: true, id, message: `Task "${args.title}" created successfully.` };
  }
});

toolRegistry.register({
  name: 'task.list',
  schema: {
    type: 'function',
    function: {
      name: 'task.list',
      description: 'List the user\'s tasks.',
      parameters: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'], description: 'Filter by status (optional)' }
        }
      }
    }
  },
  handler: async (args: any, context) => {
    const tasks = await taskService.listTasks(context.agent_id, context.user_id, args.status);
    return { success: true, count: tasks.length, tasks };
  }
});

toolRegistry.register({
  name: 'task.complete',
  schema: {
    type: 'function',
    function: {
      name: 'task.complete',
      description: 'Mark a task as completed.',
      parameters: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'The UUID of the task to complete' }
        },
        required: ['id']
      }
    }
  },
  handler: async (args: any, context) => {
    const success = await taskService.updateTaskStatus(args.id, context.agent_id, context.user_id, 'completed');
    if (!success) throw new Error('Task not found or you do not have permission to edit it.');
    return { success: true, message: 'Task marked as completed.' };
  }
});

export {};
