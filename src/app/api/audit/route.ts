import { NextResponse } from 'next/server';
import { AuditService } from '@/lib/audit/service';

const auditService = new AuditService();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const agentId = searchParams.get('agent_id');
    const ownerId = searchParams.get('user_id');

    if (!agentId || !ownerId) {
      return NextResponse.json({ error: 'Missing agent_id or user_id' }, { status: 400 });
    }

    const logs = await auditService.getRecentLogs(agentId, ownerId);
    return NextResponse.json({ logs });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
