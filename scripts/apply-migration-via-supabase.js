require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function applyMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing Supabase credentials');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  console.log('📝 Reading migration file...\n');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260203_0900_create_commitments.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('🔄 Applying migration via SQL query...\n');

  try {
    // Try executing the SQL directly
    const { data, error } = await supabase.rpc('exec_sql', { sql_string: sql });

    if (error) {
      console.error('❌ RPC Error:', error.message);
      console.log('\n📋 The migration needs to be run manually.');
      console.log('Please copy the SQL from:');
      console.log('  supabase/migrations/20260203_0900_create_commitments.sql');
      console.log('\nAnd run it in Supabase Dashboard:');
      console.log('  Dashboard → SQL Editor → New Query → Paste → Run');
      process.exit(1);
    }

    console.log('✅ Migration applied successfully!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    console.log('\n📋 The migration needs to be run manually.');
    console.log('Please copy the SQL from:');
    console.log('  supabase/migrations/20260203_0900_create_commitments.sql');
    console.log('\nAnd run it in Supabase Dashboard:');
    console.log('  1. Go to SQL Editor (left sidebar)');
    console.log('  2. Click "New query"');
    console.log('  3. Paste the migration SQL');
    console.log('  4. Click "Run"');
  }
}

applyMigration();
