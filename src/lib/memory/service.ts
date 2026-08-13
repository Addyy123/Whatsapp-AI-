import { sql } from '../db/client';

export interface Memory {
  id: string;
  agent_id: string;
  owner_id: string;
  content: string;
  category?: string;
  source: string;
  created_at: string;
}

export class MemoryService {
  async saveMemory(agentId: string, ownerId: string, content: string, category: string = 'fact'): Promise<string> {
    const mems = await sql`
      INSERT INTO memories (agent_id, owner_id, content, category, source)
      VALUES (${agentId}, ${ownerId}, ${content}, ${category}, 'tool')
      RETURNING id
    `;
    return mems[0].id;
  }

  async searchMemories(agentId: string, ownerId: string, query: string, limit: number = 10): Promise<Memory[]> {
    // Basic text search. A real production app might use pgvector here.
    // We'll use Postgres's built-in full-text search capability.
    // If the query is empty, we return the most recent memories.
    if (!query) {
      return await sql<Memory[]>`
        SELECT id, agent_id, owner_id, content, category, source, created_at 
        FROM memories 
        WHERE agent_id = ${agentId} AND owner_id = ${ownerId}
        ORDER BY created_at DESC 
        LIMIT ${limit}
      `;
    }

    // Full text search matching
    const searchTerms = query.split(' ').map(t => `${t}:*`).join(' | ');
    return await sql<Memory[]>`
      SELECT id, agent_id, owner_id, content, category, source, created_at 
      FROM memories 
      WHERE agent_id = ${agentId} AND owner_id = ${ownerId}
        AND to_tsvector('english', content) @@ to_tsquery('english', ${searchTerms})
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `;
  }

  async forgetMemory(id: string, agentId: string, ownerId: string): Promise<boolean> {
    const result = await sql`
      DELETE FROM memories 
      WHERE id = ${id} AND agent_id = ${agentId} AND owner_id = ${ownerId}
    `;
    return result.count > 0;
  }

  async listMemories(agentId: string, ownerId: string, limit: number = 50): Promise<Memory[]> {
    return await sql<Memory[]>`
      SELECT id, agent_id, owner_id, content, category, source, created_at 
      FROM memories 
      WHERE agent_id = ${agentId} AND owner_id = ${ownerId}
      ORDER BY created_at DESC 
      LIMIT ${limit}
    `;
  }
}
