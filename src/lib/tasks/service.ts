import { sql } from '../db/client';

export interface Task {
  id: string;
  agent_id: string;
  owner_id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  due_at?: string;
  completed_at?: string;
  created_at: string;
}

export class TaskService {
  async createTask(agentId: string, ownerId: string, title: string, description?: string, dueAt?: string, priority: string = 'normal'): Promise<string> {
    const tasks = await sql`
      INSERT INTO tasks (agent_id, owner_id, title, description, priority, due_at)
      VALUES (${agentId}, ${ownerId}, ${title}, ${description || null}, ${priority}, ${dueAt ? new Date(dueAt).toISOString() : null})
      RETURNING id
    `;
    return tasks[0].id;
  }

  async listTasks(agentId: string, ownerId: string, status?: string): Promise<Task[]> {
    if (status) {
      return await sql<Task[]>`
        SELECT id, title, description, status, priority, due_at, completed_at, created_at 
        FROM tasks 
        WHERE agent_id = ${agentId} AND owner_id = ${ownerId} AND status = ${status}
        ORDER BY due_at ASC NULLS LAST, created_at DESC
      `;
    }
    return await sql<Task[]>`
      SELECT id, title, description, status, priority, due_at, completed_at, created_at 
      FROM tasks 
      WHERE agent_id = ${agentId} AND owner_id = ${ownerId}
      ORDER BY status = 'completed', due_at ASC NULLS LAST, created_at DESC
    `;
  }

  async updateTaskStatus(id: string, agentId: string, ownerId: string, status: string): Promise<boolean> {
    const completedAt = status === 'completed' ? new Date().toISOString() : null;
    
    const result = await sql`
      UPDATE tasks 
      SET status = ${status}, completed_at = ${completedAt}, updated_at = now()
      WHERE id = ${id} AND agent_id = ${agentId} AND owner_id = ${ownerId}
    `;
    return result.count > 0;
  }

  async getTaskSummary(agentId: string, ownerId: string): Promise<{ pending: number, overdue: number }> {
    const counts = await sql`
      SELECT 
        COUNT(*) as pending,
        COUNT(*) FILTER (WHERE due_at < now()) as overdue
      FROM tasks
      WHERE agent_id = ${agentId} AND owner_id = ${ownerId} AND status IN ('pending', 'in_progress')
    `;
    return {
      pending: parseInt(counts[0].pending) || 0,
      overdue: parseInt(counts[0].overdue) || 0
    };
  }
}
