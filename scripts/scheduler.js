const postgres = require('postgres');
const cronParser = require('cron-parser');
const crypto = require('crypto');
require('dotenv').config({ path: '.env.local' });

const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

async function pollAutomations() {
  console.log('Scheduler tick...');
  try {
    // 1. Find all active automations that are due
    const automations = await sql`
      SELECT id, agent_id, owner_id, prompt, cron_schedule 
      FROM automations 
      WHERE status = 'active' AND next_run_at <= now()
    `;

    for (const auto of automations) {
      console.log(`Triggering automation ${auto.id}`);

      // 2. Queue a new run for the worker
      const requestId = `auto-${auto.id}-${Date.now()}`;
      await sql`
        INSERT INTO agent_runs (request_id, agent_id, user_id, source, input_message)
        VALUES (${requestId}, ${auto.agent_id}, ${auto.owner_id}, 'automation', ${auto.prompt})
      `;

      // 3. Calculate next run time
      const interval = cronParser.parseExpression(auto.cron_schedule);
      const nextRun = interval.next().toDate();

      // 4. Update the automation record
      await sql`
        UPDATE automations 
        SET last_run_at = now(), next_run_at = ${nextRun}
        WHERE id = ${auto.id}
      `;
    }
  } catch (err) {
    console.error('Scheduler error:', err);
  }
}

// Run every 60 seconds
setInterval(pollAutomations, 60 * 1000);
console.log('Scheduler started.');
pollAutomations();
