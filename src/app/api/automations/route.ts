import { NextResponse } from 'next/server';
import { AutomationService } from '@/lib/automation/service';

const automationService = new AutomationService();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agent_id');
    const ownerId = searchParams.get('user_id');

    if (!agentId || !ownerId) {
      return NextResponse.json({ error: 'Missing agent_id or user_id' }, { status: 400 });
    }

    const automations = await automationService.listAutomations(agentId, ownerId);
    const summary = await automationService.getAutomationSummary(agentId, ownerId);

    return NextResponse.json({ summary, automations });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.agent_id || !body.user_id || !body.name || !body.prompt || !body.cron_schedule) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = await automationService.createAutomation(
      body.agent_id, 
      body.user_id, 
      body.name, 
      body.prompt,
      body.cron_schedule
    );
    return NextResponse.json({ id, message: 'Automation scheduled' }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
