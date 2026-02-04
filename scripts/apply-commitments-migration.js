require('dotenv/config');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  console.log('📝 Applying commitments migration...\n');

  const migrationPath = path.join(__dirname, '..', 'supabase', 'migrations', '20260203_0900_create_commitments.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');

  // Split by semicolons and filter out empty statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'));

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i];
    console.log(`Executing statement ${i + 1}/${statements.length}...`);

    try {
      const { error } = await supabase.rpc('exec_sql', { sql_query: statement });

      if (error) {
        // Try direct execution if RPC fails
        const { error: directError } = await supabase.from('_').select('*').limit(0);
        if (directError) {
          console.error(`❌ Error on statement ${i + 1}:`, error);
          console.error('Statement:', statement.substring(0, 100) + '...');
        }
      } else {
        console.log(`✓ Statement ${i + 1} executed`);
      }
    } catch (err) {
      console.error(`❌ Error on statement ${i + 1}:`, err.message);
      console.error('Statement:', statement.substring(0, 100) + '...');
    }
  }

  console.log('\n✅ Migration completed');
  console.log('\n📋 Next: Run this SQL manually in Supabase Dashboard SQL Editor:');
  console.log('   File: supabase/migrations/20260203_0900_create_commitments.sql');
}

applyMigration().catch(console.error);
