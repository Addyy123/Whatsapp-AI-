import { sql } from '../db/client';
import { toolRegistry } from './registry';

toolRegistry.register({
  name: 'agent.configure',
  schema: {
    type: 'function',
    function: {
      name: 'agent.configure',
      description: 'Update your own configuration.',
      parameters: {
        type: 'object',
        properties: {
          response_style: { type: 'string', description: 'The style of response (e.g. professional, casual, pirate)' },
          timezone: { type: 'string', description: 'The timezone (e.g. UTC, America/New_York)' }
        }
      }
    }
  },
  handler: async (args: any, context) => {
    const updates: Record<string, string> = {};
    if (args.response_style) updates.response_style = args.response_style;
    if (args.timezone) updates.timezone = args.timezone;

    if (Object.keys(updates).length === 0) {
      return { success: false, message: 'No valid configuration fields provided.' };
    }

    const setClauses = Object.entries(updates).map(([key, value]) => sql`${sql(key)} = ${value}`);
    
    await sql`
      UPDATE agent_configs 
      SET ${sql(updates)}, updated_at = now()
      WHERE agent_id = ${context.agent_id}
    `;

    return { success: true, message: `Configuration updated: ${JSON.stringify(updates)}` };
  }
});

export {};
