const fs = require('fs');
const path = require('path');
const postgres = require('postgres');
require('dotenv').config({ path: '.env.local' });

async function migrate() {
  console.log('Connecting to Neon...');
  const sql = postgres(process.env.DATABASE_URL, { ssl: 'require' });

  const migrationsDir = path.join(__dirname, 'migrations');
  const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  for (const file of files) {
    console.log(`Running migration: ${file}...`);
    const content = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
    
    try {
      await sql.unsafe(content);
      console.log(`✅ ${file} applied successfully.`);
    } catch (err) {
      console.error(`❌ Error in ${file}:`, err.message);
      process.exit(1);
    }
  }

  console.log('🎉 All migrations applied successfully!');
  await sql.end();
}

migrate();
