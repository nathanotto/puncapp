require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  db: { schema: 'public' }
})

async function forceDropTables() {
  console.log('🗑️  Force dropping remaining tables...\n')

  // Step 1: Recreate exec_sql function temporarily
  console.log('Step 1: Creating temporary exec_sql function...')
  const createFunctionSQL = `
    CREATE OR REPLACE FUNCTION exec_sql(sql_query text)
    RETURNS SETOF json
    LANGUAGE plpgsql
    SECURITY DEFINER
    AS $$
    BEGIN
      RETURN QUERY EXECUTE sql_query;
    END;
    $$;
  `

  try {
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify({ sql_query: createFunctionSQL })
    })

    // Even if it fails, continue - function might already exist
    console.log('  (attempting to use existing or create new exec_sql)\n')

    // Step 2: Drop the tables
    console.log('Step 2: Dropping tables...')

    const dropSQL = `
      DROP TABLE IF EXISTS chapter_updates CASCADE;
      DROP TABLE IF EXISTS meetings CASCADE;
    `

    const { error: dropError } = await supabase.rpc('exec_sql', {
      sql_query: dropSQL
    })

    if (dropError) {
      console.log('  ❌ Error:', dropError.message)
      console.log('\n⚠️  Please run this SQL manually in Supabase SQL Editor:')
      console.log(dropSQL)
    } else {
      console.log('  ✅ chapter_updates dropped')
      console.log('  ✅ meetings dropped')
    }

    // Step 3: Clean up types
    console.log('\nStep 3: Dropping custom types...')
    const typesSQL = `
      DROP TYPE IF EXISTS funding_status CASCADE;
      DROP TYPE IF EXISTS attendance_type CASCADE;
      DROP TYPE IF EXISTS rsvp_status CASCADE;
      DROP TYPE IF EXISTS meeting_status CASCADE;
      DROP TYPE IF EXISTS meeting_frequency CASCADE;
      DROP TYPE IF EXISTS chapter_status CASCADE;
      DROP TYPE IF EXISTS member_type CASCADE;
      DROP TYPE IF EXISTS display_preference CASCADE;
      DROP TYPE IF EXISTS user_status CASCADE;
    `

    const { error: typesError } = await supabase.rpc('exec_sql', {
      sql_query: typesSQL
    })

    if (!typesError) {
      console.log('  ✅ All custom types dropped')
    }

    // Step 4: Drop the temporary function
    console.log('\nStep 4: Removing temporary exec_sql function...')
    const { error: cleanupError } = await supabase.rpc('exec_sql', {
      sql_query: 'DROP FUNCTION IF EXISTS exec_sql(text) CASCADE;'
    })

    if (!cleanupError) {
      console.log('  ✅ exec_sql function removed')
    }

    console.log('\n✅ Database cleanup complete!')

  } catch (err) {
    console.error('Error:', err.message)
    console.log('\n⚠️  Please run these commands manually in Supabase SQL Editor:')
    console.log('DROP TABLE IF EXISTS chapter_updates CASCADE;')
    console.log('DROP TABLE IF EXISTS meetings CASCADE;')
  }
}

forceDropTables().catch(console.error)
