#!/usr/bin/env node
/**
 * Execute SQL queries against Supabase directly
 * Usage: node scripts/sql.js "SELECT * FROM users;"
 *    OR: node scripts/sql.js -f path/to/file.sql
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load .env.local
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey || serviceRoleKey === 'your_service_role_key') {
  console.error('❌ Missing Supabase credentials in .env.local');
  console.error('   Need: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Create admin client with service role (bypasses RLS)
const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function executeSql(sql) {
  console.log('📝 Executing SQL...\n');

  try {
    // Use the PostgREST API to execute SQL via rpc
    // Note: This requires a custom function or we use the REST API directly

    // For SELECT queries, try to parse and use the appropriate table
    const trimmedSql = sql.trim().toLowerCase();

    if (trimmedSql.startsWith('select')) {
      // For simple SELECT queries, try to execute directly
      // This is a workaround since direct SQL execution isn't available via JS client
      console.log('⚠️  Note: For complex SQL, use Supabase SQL Editor');
      console.log('   This script works best for SELECT queries on single tables\n');
    }

    // Actually, let's use a different approach - create a PL/pgSQL function
    // that can execute arbitrary SQL

    const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });

    if (error) {
      // If the function doesn't exist, give helpful instructions
      if (error.code === 'PGRST202') {
        console.error('❌ The exec_sql function does not exist yet.');
        console.error('\nTo enable direct SQL execution, run this in Supabase SQL Editor:');
        console.error('\n' + '-'.repeat(60));
        console.error(`
CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result json;
BEGIN
  EXECUTE sql_query INTO result;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION exec_sql TO service_role;
`);
        console.error('-'.repeat(60));
        process.exit(1);
      }

      throw error;
    }

    console.log('✅ Success!\n');
    console.log(JSON.stringify(data, null, 2));

  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.details) console.error('   Details:', err.details);
    if (err.hint) console.error('   Hint:', err.hint);
    process.exit(1);
  }
}

// Parse command line arguments
const args = process.argv.slice(2);

if (args.length === 0) {
  console.error('Usage: node scripts/sql.js "SELECT * FROM users LIMIT 5;"');
  console.error('   OR: node scripts/sql.js -f path/to/file.sql');
  process.exit(1);
}

let sql = '';

if (args[0] === '-f') {
  // Read from file
  if (!args[1]) {
    console.error('Error: -f requires a file path');
    process.exit(1);
  }

  const filePath = path.resolve(args[1]);

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  sql = fs.readFileSync(filePath, 'utf8');
} else {
  // Direct SQL from command line
  sql = args.join(' ');
}

// Execute the SQL
executeSql(sql);
