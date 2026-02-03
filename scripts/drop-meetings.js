require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function dropMeetings() {
  console.log('Checking meetings table...')

  // Try to select from it
  const { data, error } = await supabase.from('meetings').select('id').limit(1)

  if (error) {
    console.log('✅ meetings table does not exist:', error.message)
    return
  }

  if (data !== undefined) {
    console.log('❌ meetings table still exists! Dropping it now...')

    // We can't use exec_sql anymore, so let's try using the SQL editor approach
    console.log('\nPlease run this SQL in your Supabase SQL Editor:')
    console.log('DROP TABLE IF EXISTS meetings CASCADE;')
  }
}

dropMeetings().catch(console.error)
