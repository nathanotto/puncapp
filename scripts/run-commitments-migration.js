require('dotenv').config({ path: '.env.local' });
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function runMigration() {
  // Build connection string from components
  const dbUser = process.env.SUPABASE_DB_USER;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;
  const dbHost = process.env.SUPABASE_DB_HOST;
  const dbPort = process.env.SUPABASE_DB_PORT;
  const dbName = process.env.SUPABASE_DB_NAME;

  if (!dbUser || !dbPassword || !dbHost) {
    console.error('❌ Missing database credentials in .env.local');
    process.exit(1);
  }

  const connectionString = `postgresql://${dbUser}:${dbPassword}@${dbHost}:${dbPort}/${dbName}`;

  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('✓ Connected to database\n');

    const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260203_0900_create_commitments.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('📝 Running commitments migration...\n');

    await client.query(sql);

    console.log('✅ Migration completed successfully!\n');
    console.log('Created:');
    console.log('  - commitments table');
    console.log('  - Row Level Security policies');
    console.log('  - Indexes for performance');
    console.log('  - Triggers for pending tasks');

  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

runMigration();
