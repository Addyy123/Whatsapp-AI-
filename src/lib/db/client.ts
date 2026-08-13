import postgres from 'postgres';

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('Missing DATABASE_URL environment variable');
}

// Create a singleton instance of the database connection
// so we don't exhaust connection limits in serverless environments.
const globalForPostgres = globalThis as unknown as {
  sql: postgres.Sql | undefined;
};

export const sql = globalForPostgres.sql ?? postgres(databaseUrl, { 
  idle_timeout: 20, 
  max_lifetime: 60 * 30 
});

if (process.env.NODE_ENV !== 'production') {
  globalForPostgres.sql = sql;
}
