import { NextResponse } from 'next/server';
import { AgentOrchestrator } from '@/lib/agent/orchestrator';
import { AgentPersistence } from '@/lib/agent/persistence';
import { ContextBuilder } from '@/lib/agent/context';
import { Planner } from '@/lib/agent/planner';
import { ToolExecutor } from '@/lib/agent/executor';
import { PolicyEngine } from '@/lib/agent/policy';
import { AuditService } from '@/lib/audit/service';
import { MemoryService } from '@/lib/memory/service';
import { TaskService } from '@/lib/tasks/service';
import { AutomationService } from '@/lib/automation/service';
import { GroqProvider } from '@/lib/llm/groq';
import { toolRegistry } from '@/lib/tools/registry';

// Ensure tools are registered
import '@/lib/tools/memory';
import '@/lib/tools/tasks';
import '@/lib/tools/automation';
import '@/lib/tools/search';
import '@/lib/tools/agent';

export const maxDuration = 300; // Allow 5 minutes for agent to process

// Dependency injection
const groq = new GroqProvider(process.env.GROQ_API_KEY!);
const persistence = new AgentPersistence();
const memoryService = new MemoryService();
const taskService = new TaskService();
const automationService = new AutomationService();
const policyEngine = new PolicyEngine();
const auditService = new AuditService();
const executor = new ToolExecutor(toolRegistry, policyEngine, auditService);
const contextBuilder = new ContextBuilder(persistence, memoryService, taskService, automationService);
const planner = new Planner(groq, executor);
const orchestrator = new AgentOrchestrator(persistence, contextBuilder, planner);

/**
 * POST /api/whatsapp/webhook
 * 
 * Receives normalized messages from the WhatsApp bridge.
 * Authenticates with X-Bridge-Secret header.
 * Calls the agent orchestrator and returns the reply.
 * The bridge is responsible for forwarding the reply back to WhatsApp.
 */
export async function POST(request: Request) {
  // ── Authentication ────────────────────────────────────────────────────────
  const bridgeSecret = request.headers.get('x-bridge-secret');
  if (!bridgeSecret || bridgeSecret !== process.env.BRIDGE_SECRET) {
    console.warn('[whatsapp/webhook] Unauthorized request — bad or missing X-Bridge-Secret');
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    const {
      agent_id,
      user_id,
      message,
      source,
      request_id,
      senderId,
      messageId,
      channel,
    } = body;

    if (!agent_id || !user_id || !message || !request_id) {
      return NextResponse.json(
        { error: 'Missing required fields: agent_id, user_id, message, request_id' },
        { status: 400 }
      );
    }

    console.log(`[whatsapp/webhook] Message from ${senderId?.slice(-4) ?? 'unknown'}: "${message.slice(0, 80)}"`);

    const agentResponse = await orchestrator.run({
      agent_id,
      user_id,
      message,
      source: source ?? 'whatsapp',
      request_id,
      metadata: {
        channel: channel ?? 'whatsapp',
        senderId,
        messageId,
      },
    });

    return NextResponse.json({
      reply: agentResponse.reply,
      status: agentResponse.status,
      run_id: agentResponse.run_id,
    });

  } catch (error: any) {
    console.error('[whatsapp/webhook] Error:', error);
    if (error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}
