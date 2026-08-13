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
import { AgentRequest } from '@/lib/agent/types';

// Ensure tools are registered
import '@/lib/tools/memory';
import '@/lib/tools/tasks';
import '@/lib/tools/automation';
import '@/lib/tools/search';
import '@/lib/tools/agent';

// Poor man's dependency injection
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

export async function POST(req: Request) {
  try {
    const body: AgentRequest = await req.json();

    if (!body.agent_id || !body.user_id || !body.message || !body.request_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const response = await orchestrator.run(body);
    return NextResponse.json(response);
    
  } catch (error: any) {
    console.error('Agent run failed:', error);
    if (error.name === 'AuthError') {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
