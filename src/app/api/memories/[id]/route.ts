import { NextResponse } from 'next/server';
import { MemoryService } from '@/lib/memory/service';

const memoryService = new MemoryService();

export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const params = await props.params;
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agent_id');
    const ownerId = searchParams.get('user_id');

    if (!agentId || !ownerId) {
      return NextResponse.json({ error: 'Missing agent_id or user_id in query params' }, { status: 400 });
    }

    const success = await memoryService.forgetMemory(params.id, agentId, ownerId);
    
    if (!success) {
      return NextResponse.json({ error: 'Memory not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Memory deleted' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
