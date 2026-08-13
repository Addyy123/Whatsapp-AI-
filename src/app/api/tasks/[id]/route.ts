import { NextResponse } from 'next/server';
import { TaskService } from '@/lib/tasks/service';

const taskService = new TaskService();

export async function PATCH(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const body = await req.json();
    if (!body.agent_id || !body.user_id || !body.status) {
      return NextResponse.json({ error: 'Missing required fields (agent_id, user_id, status)' }, { status: 400 });
    }

    const success = await taskService.updateTaskStatus(params.id, body.agent_id, body.user_id, body.status);
    
    if (!success) {
      return NextResponse.json({ error: 'Task not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Task updated' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
