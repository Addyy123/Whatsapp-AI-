import { NextResponse } from 'next/server';

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL;
const BRIDGE_SECRET = process.env.BRIDGE_SECRET;

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/whatsapp/events
 * 
 * SSE proxy: streams events from the WhatsApp bridge to the dashboard.
 * The frontend subscribes here — the bridge URL is never exposed to the client.
 * 
 * Events emitted:
 *  { type: 'qr', qrDataUrl: '...' }
 *  { type: 'state', status: 'connected', phoneMasked: '...', connectedAt: '...' }
 *  { type: 'state', status: 'disconnected' }
 *  { type: 'state', status: 'qr_required' }
 *  { type: 'connected', status: '...' }    (initial status on subscribe)
 */
export async function GET() {
  if (!BRIDGE_URL) {
    // Return a single error event so the UI knows
    const stream = new ReadableStream({
      start(controller) {
        const msg = `data: ${JSON.stringify({ type: 'error', message: 'Bridge not configured' })}\n\n`;
        controller.enqueue(new TextEncoder().encode(msg));
        controller.close();
      },
    });
    return new NextResponse(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  }

  let bridgeRes: Response;
  try {
    bridgeRes = await fetch(`${BRIDGE_URL}/bridge/events`, {
      headers: { 'X-Bridge-Secret': BRIDGE_SECRET ?? '' },
      // No timeout — this is an infinite SSE stream
    });
  } catch {
    const stream = new ReadableStream({
      start(controller) {
        const msg = `data: ${JSON.stringify({ type: 'error', message: 'Bridge unreachable' })}\n\n`;
        controller.enqueue(new TextEncoder().encode(msg));
        controller.close();
      },
    });
    return new NextResponse(stream, {
      headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
    });
  }

  // Pipe the bridge SSE stream through to the client
  const bridgeBody = bridgeRes.body;
  if (!bridgeBody) {
    return new NextResponse('No stream from bridge', { status: 502 });
  }

  return new NextResponse(bridgeBody, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
