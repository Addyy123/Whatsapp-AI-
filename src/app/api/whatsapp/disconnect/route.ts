import { NextResponse } from 'next/server';

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL;
const BRIDGE_SECRET = process.env.BRIDGE_SECRET;

/**
 * POST /api/whatsapp/disconnect
 * Proxies to the bridge to disconnect the WhatsApp session.
 */
export async function POST() {
  if (!BRIDGE_URL) {
    return NextResponse.json({ error: 'Bridge not configured' }, { status: 503 });
  }

  try {
    const res = await fetch(`${BRIDGE_URL}/bridge/session/disconnect`, {
      method: 'POST',
      headers: { 'X-Bridge-Secret': BRIDGE_SECRET ?? '' },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    return NextResponse.json({ error: 'Bridge unreachable' }, { status: 503 });
  }
}
