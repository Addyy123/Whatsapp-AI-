// src/lib/whatsapp/client.ts
// WhatsApp bridge HTTP client.
// Used by the agent tools/automations to send outbound WhatsApp messages
// through the linked-device bridge.
// 
// This replaces the old Meta Cloud API implementation.

const BRIDGE_URL = process.env.WHATSAPP_BRIDGE_URL;
const BRIDGE_SECRET = process.env.BRIDGE_SECRET;

/**
 * Send a WhatsApp message through the bridge.
 * @param to   - Recipient phone number (e.g. "911234567890" or full JID)
 * @param text - Message text
 */
export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  if (!BRIDGE_URL || !BRIDGE_SECRET) {
    console.error('[whatsapp/client] WHATSAPP_BRIDGE_URL or BRIDGE_SECRET is not configured');
    return;
  }

  try {
    const res = await fetch(`${BRIDGE_URL}/bridge/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Bridge-Secret': BRIDGE_SECRET,
      },
      body: JSON.stringify({
        connectionId: 'whatsapp',
        recipient: to,
        text,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error('[whatsapp/client] Send failed:', res.status, err);
    }
  } catch (error) {
    console.error('[whatsapp/client] Error sending message:', error);
  }
}
