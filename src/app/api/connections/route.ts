import { NextResponse } from 'next/server';
import { ConnectionService } from '@/lib/connections/service';

const connectionService = new ConnectionService();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get('user_id');

    if (!ownerId) {
      return NextResponse.json({ error: 'Missing user_id' }, { status: 400 });
    }

    const connections = await connectionService.listConnections(ownerId);
    return NextResponse.json({ connections });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.user_id || !body.provider || !body.token) {
      return NextResponse.json({ error: 'Missing user_id, provider, or token' }, { status: 400 });
    }

    await connectionService.addConnection(body.user_id, body.provider, body.token);
    return NextResponse.json({ success: true, message: 'Connection added' }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerId = searchParams.get('user_id');
    const provider = searchParams.get('provider');

    if (!ownerId || !provider) {
      return NextResponse.json({ error: 'Missing user_id or provider' }, { status: 400 });
    }

    await connectionService.removeConnection(ownerId, provider);
    return NextResponse.json({ success: true, message: 'Connection removed' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
