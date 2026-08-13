import { sql } from '../db/client';
import { AgentRequest, Agent, AgentConfig, Conversation } from './types';
import { ChatMessage } from '../llm/types';
import { randomUUID } from 'crypto';

export class AgentPersistence {
  async getAgent(agentId: string): Promise<Agent | null> {
    const agents = await sql<Agent[]>`SELECT * FROM agents WHERE id = ${agentId} AND status = 'active'`;
    return agents[0] || null;
  }

  async getAgentConfig(agentId: string): Promise<AgentConfig | null> {
    const configs = await sql<AgentConfig[]>`SELECT * FROM agent_configs WHERE agent_id = ${agentId}`;
    return configs[0] || null;
  }

  async getRunByRequestId(requestId: string): Promise<{ response: any } | null> {
    const runs = await sql`SELECT output_reply, status, tool_calls, actions FROM agent_runs WHERE request_id = ${requestId}`;
    if (runs.length > 0 && runs[0].status !== 'running') {
      return {
        response: {
          run_id: runs[0].id,
          status: runs[0].status,
          reply: runs[0].output_reply,
          actions: runs[0].actions || [],
        }
      };
    }
    return null;
  }

  async ensureConversation(req: AgentRequest): Promise<Conversation> {
    if (req.conversation_id) {
      const convs = await sql<Conversation[]>`
        SELECT * FROM conversations 
        WHERE id = ${req.conversation_id} AND agent_id = ${req.agent_id} AND user_id = ${req.user_id}
      `;
      if (convs.length > 0) return convs[0];
    }
    
    // Create new
    const id = req.conversation_id || randomUUID();
    const convs = await sql<Conversation[]>`
      INSERT INTO conversations (id, agent_id, user_id, channel_source)
      VALUES (${id}, ${req.agent_id}, ${req.user_id}, ${req.source})
      RETURNING *
    `;
    return convs[0];
  }

  async saveMessage(params: { conversation_id: string, role: string, content: string, tool_call_id?: string, tool_name?: string }) {
    // Note: in a real app, agent_id is needed on messages per schema
    const conv = await sql`SELECT agent_id FROM conversations WHERE id = ${params.conversation_id}`;
    
    await sql`
      INSERT INTO messages (conversation_id, agent_id, role, content, tool_call_id, tool_name)
      VALUES (${params.conversation_id}, ${conv[0].agent_id}, ${params.role}, ${params.content}, ${params.tool_call_id || null}, ${params.tool_name || null})
    `;
    
    await sql`UPDATE conversations SET last_message_at = now() WHERE id = ${params.conversation_id}`;
  }

  async getRecentMessages(conversationId: string, limit: number = 20): Promise<ChatMessage[]> {
    const messages = await sql`
      SELECT role, content, tool_call_id, tool_name 
      FROM messages 
      WHERE conversation_id = ${conversationId}
      ORDER BY created_at ASC
    `;
    // We only take the last 'limit' messages to avoid context window explosion
    const recent = messages.slice(-limit);
    
    return recent.map(m => ({
      role: m.role as any,
      content: m.content,
      tool_call_id: m.tool_call_id,
      name: m.tool_name
    }));
  }

  async createRun(req: AgentRequest): Promise<string> {
    const runs = await sql`
      INSERT INTO agent_runs (request_id, agent_id, user_id, conversation_id, source, input_message)
      VALUES (${req.request_id}, ${req.agent_id}, ${req.user_id}, ${req.conversation_id || null}, ${req.source}, ${req.message})
      RETURNING id
    `;
    return runs[0].id;
  }

  async finalizeRun(runId: string, data: any) {
    await sql`
      UPDATE agent_runs 
      SET status = ${data.status}, output_reply = ${data.output_reply}, 
          tool_calls = ${data.tool_calls}, actions = ${data.actions}, 
          duration_ms = ${data.duration_ms}, completed_at = now()
      WHERE id = ${runId}
    `;
  }

  async failRun(runId: string, error: any) {
    await sql`
      UPDATE agent_runs 
      SET status = 'failed', error_message = ${error.message}, completed_at = now()
      WHERE id = ${runId}
    `;
  }
}
