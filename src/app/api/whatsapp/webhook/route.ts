import { NextResponse } from 'next/server';
import { AgentOrchestrator } from '@/lib/agent/orchestrator';
import { sendWhatsAppMessage } from '@/lib/whatsapp/client';

export const maxDuration = 300; // Allow 5 minutes for agent to process

// Verify Webhook for Meta
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode && token) {
    if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
      console.log('WEBHOOK_VERIFIED');
      return new NextResponse(challenge, { status: 200 });
    } else {
      return new NextResponse('Forbidden', { status: 403 });
    }
  }

  return new NextResponse('Bad Request', { status: 400 });
}

// Receive Messages
export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Check if it's a WhatsApp status update or message
    if (body.object === 'whatsapp_business_account') {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;

      // Handle actual messages
      if (value?.messages && value.messages.length > 0) {
        const message = value.messages[0];
        const from = message.from; // Sender phone number
        
        // We only handle text messages for now
        if (message.type === 'text') {
          const text = message.text.body;
          
          console.log(`Received WhatsApp message from ${from}: ${text}`);

          // Forward to our Agent Orchestrator
          const orchestrator = new AgentOrchestrator();
          
          // Use the phone number as the conversation/session ID so history is maintained
          const response = await orchestrator.run({
            query: text,
            conversation_id: from 
          });

          // Send the agent's reply back via WhatsApp
          await sendWhatsAppMessage(from, response.response);
        }
      }

      return new NextResponse('OK', { status: 200 });
    } else {
      return new NextResponse('Not Found', { status: 404 });
    }
  } catch (error) {
    console.error('Webhook error:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
