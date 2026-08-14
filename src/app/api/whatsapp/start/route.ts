import { NextResponse } from 'next/server';

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL;
const BRIDGE_SECRET = process.env.BRIDGE_SECRET;

/**
 * POST /api/whatsapp/start
 * Proxies to the bridge to start a new WhatsApp session.
 * Returns immediately — state updates arrive via SSE (/api/whatsapp/events).
 */
export async function POST() {
  if (!BRIDGE_URL) {
    return NextResponse.json(
      { error: 'WhatsApp bridge not configured (WHATSAPP_BRIDGE_URL missing)' },
      { status: 503 }
    );
  }

  try {
    const res = await fetch(`${BRIDGE_URL}/bridge/session/start`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bridge-Secret': BRIDGE_SECRET ?? '',
      },
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    console.error('[whatsapp/start] Bridge unreachable:', err.message);
    return NextResponse.json(
      { error: 'WhatsApp bridge is unreachable. Make sure it is running.' },
      { status: 503 }
    );
  }
}
