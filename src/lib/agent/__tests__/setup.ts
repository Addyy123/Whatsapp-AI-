import { afterAll } from 'vitest';
import { sql } from '@/lib/db/client';

afterAll(async () => {
  // Global teardown for E2E tests
  const testUserId = '148d2021-cd42-4ff5-8eaf-c5cdb9af8aa9'; // Use valid UUIDs
  const testAgentId = '5549808b-82b6-47bc-ac6d-c0f3210f887d';

  try {
    await sql`DELETE FROM automations WHERE owner_id = ${testUserId}`;
    await sql`DELETE FROM tasks WHERE owner_id = ${testUserId}`;
    await sql`DELETE FROM memories WHERE owner_id = ${testUserId}`;
    await sql`DELETE FROM messages WHERE conversation_id IN (SELECT id FROM conversations WHERE user_id = ${testUserId})`;
    await sql`DELETE FROM conversations WHERE user_id = ${testUserId}`;
    await sql`DELETE FROM agent_configs WHERE agent_id = ${testAgentId}`;
  } catch (err) {
    console.error("Failed to clean up test data", err);
  } finally {
    // Close the connection so Vitest can exit
    await sql.end();
  }
});
