require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');
// Since this is a vanilla node script, we must use ts-node or compile our TS classes to use them here.
// But wait, the simplest way to run our agent in the background in a Next.js environment is to just POST to our own API route!
// This avoids needing to instantiate the entire TypeScript orchestrator inside a plain JS file.

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

async function pollWorker() {
  console.log('Worker tick...');
  try {
    // 1. Claim a pending automation run using our atomic stored procedure
    // Note: 'claim_automation_run' was created in our 004_functions.sql migration
    const claimed = await sql`SELECT * FROM claim_automation_run()`;
    
    if (claimed.length === 0) {
      return; // No pending runs
    }

    const run = claimed[0];
    console.log(`[Worker] Claimed run: ${run.id} for agent ${run.agent_id}`);

    // 2. Call the Agent API
    const response = await fetch(`${API_URL}/api/agent/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agent_id: run.agent_id,
        user_id: run.user_id,
        message: run.input_message,
        source: 'automation',
        request_id: run.request_id // Will trigger idempotency block, but wait, the API route expects a new request_id or it returns cached!
        // The scheduler generated a new request_id, so it's fine.
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Worker] Agent run failed: ${errorText}`);
      // The API route handles marking the run as failed in the DB.
    } else {
      console.log(`[Worker] Successfully completed run: ${run.id}`);
    }

  } catch (err) {
    console.error('Worker error:', err);
  }
}

// Poll every 10 seconds
setInterval(pollWorker, 10 * 1000);
console.log('Worker started.');
pollWorker();
