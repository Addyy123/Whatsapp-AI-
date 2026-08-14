import { sql } from '../db/client';

export interface Automation {
  id: string;
  agent_id: string;
  owner_id: string;
  name: string;
  prompt: string;
  cron_schedule: string;
  status: 'active' | 'paused' | 'error';
  last_run_at?: string;
  next_run_at: string;
}

export class AutomationService {
  async createAutomation(agentId: string, ownerId: string, name: string, prompt: string, cronSchedule: string): Promise<string> {
    const automations = await sql`
      INSERT INTO automations (agent_id, owner_id, name, prompt, cron_schedule, next_run_at)
      VALUES (${agentId}, ${ownerId}, ${name}, ${prompt}, ${cronSchedule}, now())
      RETURNING id
    `;
    return automations[0].id;
  }

  async listAutomations(agentId: string, ownerId: string): Promise<Automation[]> {
    return await sql<Automation[]>`
      SELECT id, name, prompt, cron_schedule, status, last_run_at, next_run_at 
      FROM automations 
      WHERE agent_id = ${agentId} AND owner_id = ${ownerId}
      ORDER BY created_at DESC
    `;
  }

  async updateStatus(id: string, agentId: string, ownerId: string, status: string): Promise<boolean> {
    const result = await sql`
      UPDATE automations 
      SET status = ${status} 
      WHERE id = ${id} AND agent_id = ${agentId} AND owner_id = ${ownerId}
    `;
    return result.count > 0;
  }

  async getAutomationSummary(agentId: string, ownerId: string): Promise<number> {
    const counts = await sql`
      SELECT COUNT(*) as active
      FROM automations
      WHERE agent_id = ${agentId} AND owner_id = ${ownerId} AND status = 'active'
    `;
    return parseInt(counts[0].active) || 0;
  }
}
