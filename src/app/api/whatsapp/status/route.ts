import { NextResponse } from 'next/server';

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL;
const BRIDGE_SECRET = process.env.BRIDGE_SECRET;

/**
 * GET /api/whatsapp/status
 * Proxies to the bridge to get current session status.
 */
export async function GET() {
  if (!BRIDGE_URL) {
    return NextResponse.json({ status: 'bridge_not_configured' });
  }

  try {
    const res = await fetch(`${BRIDGE_URL}/bridge/session/status`, {
      headers: { 'X-Bridge-Secret': BRIDGE_SECRET ?? '' },
      // Short timeout — this is a status check
      signal: AbortSignal.timeout(5000),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ status: 'bridge_unreachable' });
  }
}
