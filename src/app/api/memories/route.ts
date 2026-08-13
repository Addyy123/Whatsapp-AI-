import { NextResponse } from 'next/server';
import { MemoryService } from '@/lib/memory/service';

const memoryService = new MemoryService();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agent_id');
    const ownerId = searchParams.get('user_id');
    const query = searchParams.get('q');

    if (!agentId || !ownerId) {
      return NextResponse.json({ error: 'Missing agent_id or user_id' }, { status: 400 });
    }

    let memories;
    if (query) {
      memories = await memoryService.searchMemories(agentId, ownerId, query);
    } else {
      memories = await memoryService.listMemories(agentId, ownerId);
    }

    return NextResponse.json({ memories });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.agent_id || !body.user_id || !body.content) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = await memoryService.saveMemory(body.agent_id, body.user_id, body.content, body.category);
    return NextResponse.json({ id, message: 'Memory saved' }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
