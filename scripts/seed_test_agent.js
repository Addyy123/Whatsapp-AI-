const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

async function seed() {
  console.log('Connecting to database...');
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

  try {
    // 1. Create a User
    const users = await sql`
      INSERT INTO users (email, display_name) 
      VALUES ('test@example.com', 'Test User') 
      ON CONFLICT (email) DO UPDATE SET display_name = 'Test User'
      RETURNING id
    `;
    const userId = users[0].id;
    console.log('✅ User seeded:', userId);

    // 2. Create an Agent
    const agents = await sql`
      INSERT INTO agents (owner_id, name, description) 
      VALUES (${userId}, 'Alice', 'You are a smart personal assistant.')
      RETURNING id
    `;
    const agentId = agents[0].id;
    console.log('✅ Agent seeded:', agentId);

    // 3. Create Agent Config
    await sql`
      INSERT INTO agent_configs (agent_id, autonomy_level) 
      VALUES (${agentId}, 1)
      ON CONFLICT (agent_id) DO NOTHING
    `;
    console.log('✅ Agent config seeded');
    
    console.log('\n=============================================');
    console.log('TESTING CREDENTIALS:');
    console.log('User ID: ', userId);
    console.log('Agent ID:', agentId);
    console.log('=============================================\n');

  } catch (err) {
    console.error('❌ Error seeding:', err.message);
  } finally {
    await sql.end();
  }
}

seed();
