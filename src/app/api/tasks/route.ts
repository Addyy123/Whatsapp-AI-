import { NextResponse } from 'next/server';
import { TaskService } from '@/lib/tasks/service';

const taskService = new TaskService();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agent_id');
    const ownerId = searchParams.get('user_id');
    const status = searchParams.get('status') || undefined;

    if (!agentId || !ownerId) {
      return NextResponse.json({ error: 'Missing agent_id or user_id' }, { status: 400 });
    }

    const tasks = await taskService.listTasks(agentId, ownerId, status);
    const summary = await taskService.getTaskSummary(agentId, ownerId);

    return NextResponse.json({ summary, tasks });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.agent_id || !body.user_id || !body.title) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = await taskService.createTask(
      body.agent_id, 
      body.user_id, 
      body.title, 
      body.description,
      body.due_at,
      body.priority
    );
    return NextResponse.json({ id, message: 'Task created' }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
