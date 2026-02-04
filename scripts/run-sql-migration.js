require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

async function runMigration(migrationFile) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  console.log(`📝 Running migration: ${migrationFile}\n`);

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', migrationFile);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  try {
    // Use the SQL editor API endpoint
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      console.error('❌ API Error:', response.status, response.statusText);
      const text = await response.text();
      console.error('Response:', text);
      console.log('\n📋 Please run the SQL manually in Supabase Dashboard:');
      console.log(`   File: supabase/migrations/${migrationFile}`);
      process.exit(1);
    }

    console.log('✅ Migration completed successfully!');
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📋 Please run the SQL manually in Supabase Dashboard:');
    console.log(`   1. Go to https://supabase.com/dashboard/project/${supabaseUrl.split('//')[1].split('.')[0]}/sql/new`);
    console.log(`   2. Copy contents from: supabase/migrations/${migrationFile}`);
    console.log('   3. Paste and click Run');
  }
}

const migrationFile = process.argv[2] || '20260203_0900_create_commitments.sql';
runMigration(migrationFile);
