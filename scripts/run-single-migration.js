require('dotenv').config({ path: '.env.local' });
const fs = require('fs');
const path = require('path');

async function runMigration() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (!supabaseUrl || !serviceKey || !dbPassword) {
    console.error('❌ Missing environment variables');
    process.exit(1);
  }

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260203_0900_create_commitments.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('📝 Running commitments migration...\n');

  // Use Supabase Management API to run SQL
  const projectRef = supabaseUrl.split('//')[1].split('.')[0];

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceKey}`,
          'Content-Type': 'application/json',
          'apikey': serviceKey
        },
        body: JSON.stringify({ query: sql })
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ API Error:', response.status, errorText);
      throw new Error('Failed to run migration via API');
    }

    const result = await response.json();
    console.log('✅ Migration completed successfully!\n');
    console.log('Created:');
    console.log('  - commitments table');
    console.log('  - RLS policies');
    console.log('  - Indexes');
    console.log('  - Triggers and functions');

  } catch (error) {
    console.error('\n❌ Could not run migration programmatically');
    console.error('Error:', error.message);
    console.log('\n📋 Please run manually in Supabase Dashboard:');
    console.log('  1. Open: https://supabase.com/dashboard/project/krfbavajdsgehhfngpcs/sql/new');
    console.log('  2. Copy SQL from: MIGRATION-TO-RUN.sql');
    console.log('  3. Paste and click RUN');
  }
}

runMigration();
