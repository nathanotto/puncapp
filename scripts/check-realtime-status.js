require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRealtimeStatus() {
  console.log('🔍 Checking Realtime Publication Status...\n')

  try {
    // Query the publication tables directly
    const { data, error } = await supabase.rpc('exec_sql', {
      query: `
        SELECT tablename
        FROM pg_publication_tables
        WHERE pubname = 'supabase_realtime'
        ORDER BY tablename;
      `
    })

    if (error) {
      console.log('Using alternative method...')

      // Try using a direct query
      const result = await supabase
        .from('pg_publication_tables')
        .select('tablename')
        .eq('pubname', 'supabase_realtime')

      console.log('Query result:', result)
    } else {
      console.log('Tables in supabase_realtime publication:')
      console.log(data)
    }

  } catch (err) {
    console.error('Error:', err.message)
  }

  // Check replica identity
  console.log('\n🔍 Checking replica identity...\n')

  const tables = ['attendance', 'meetings', 'meeting_time_log', 'curriculum_responses']

  for (const table of tables) {
    const { data, error } = await supabase
      .from(table)
      .select('*')
      .limit(1)

    if (error) {
      console.log(`❌ ${table}: Error - ${error.message}`)
    } else {
      console.log(`✅ ${table}: Accessible`)
    }
  }

  console.log('\n💡 If tables are accessible but realtime not working, check:')
  console.log('   1. Supabase Dashboard -> Database -> Replication')
  console.log('   2. Verify "attendance" table is in the replication list')
  console.log('   3. Try toggling replication off/on for the table\n')
}

checkRealtimeStatus()
