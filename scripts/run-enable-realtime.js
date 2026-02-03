require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Create client with service role to access SQL
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  db: { schema: 'public' }
})

async function enableRealtime() {
  console.log('Attempting to enable real-time replication...\n')
  
  // Try direct query approach
  try {
    // This won't work via the JS client, we need to use SQL editor
    console.log('⚠️  Cannot execute ALTER PUBLICATION via JavaScript client')
    console.log('\nPlease run this SQL manually in Supabase SQL Editor:')
    console.log('='.repeat(60))
    console.log(`
ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
ALTER PUBLICATION supabase_realtime ADD TABLE meetings;

-- Verify
SELECT schemaname, tablename 
FROM pg_publication_tables 
WHERE pubname = 'supabase_realtime' 
ORDER BY tablename;
    `)
    console.log('='.repeat(60))
    console.log('\nSteps:')
    console.log('1. Go to: https://supabase.com/dashboard/project/krfbavajdsgehhfngpcs')
    console.log('2. Click "SQL Editor" in the left sidebar')
    console.log('3. Click "New Query"')
    console.log('4. Paste the SQL above')
    console.log('5. Click "Run" or press Cmd+Enter')
    console.log('\nOr copy from: scripts/enable-realtime.sql')
  } catch (error) {
    console.error('Error:', error.message)
  }
}

enableRealtime()
