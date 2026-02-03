require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function verifyCleanup() {
  console.log('🔍 Checking remaining database objects...\n')

  // Check for remaining tables
  const { data: tables } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
      ORDER BY table_name;
    `
  })

  console.log('Tables in public schema:')
  if (tables && tables.length > 0) {
    tables.forEach(t => console.log(`  - ${t.table_name}`))
  } else {
    console.log('  (none) ✅')
  }

  // Check for custom types
  const { data: types } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT typname
      FROM pg_type
      WHERE typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      AND typtype = 'e'
      ORDER BY typname;
    `
  })

  console.log('\nCustom ENUM types in public schema:')
  if (types && types.length > 0) {
    types.forEach(t => console.log(`  - ${t.typname}`))
  } else {
    console.log('  (none) ✅')
  }

  // Check for custom functions
  const { data: functions } = await supabase.rpc('exec_sql', {
    sql_query: `
      SELECT routine_name
      FROM information_schema.routines
      WHERE routine_schema = 'public'
      ORDER BY routine_name;
    `
  })

  console.log('\nCustom functions in public schema:')
  if (functions && functions.length > 0) {
    functions.forEach(f => console.log(`  - ${f.routine_name}`))
  } else {
    console.log('  (none) ✅')
  }
}

verifyCleanup().catch(console.error)
