import { sql } from '../db/client';

export interface AuditEvent {
  id: string;
  agent_id: string;
  owner_id: string;
  action_type: string;
  details: any;
  created_at: string;
}

export class AuditService {
  async logEvent(agentId: string, ownerId: string, actionType: string, details: any): Promise<void> {
    try {
      await sql`
        INSERT INTO audit_logs (agent_id, owner_id, action_type, details)
        VALUES (${agentId}, ${ownerId}, ${actionType}, ${sql.json(details)})
      `;
    } catch (err) {
      console.error('Failed to write audit log:', err);
      // We do not throw here to prevent bringing down the agent just because logging failed.
    }
  }

  async getRecentLogs(agentId: string, ownerId: string, limit = 50): Promise<AuditEvent[]> {
    return await sql<AuditEvent[]>`
      SELECT id, agent_id, owner_id, action_type, details, created_at 
      FROM audit_logs 
      WHERE agent_id = ${agentId} AND owner_id = ${ownerId}
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `;
  }
}
