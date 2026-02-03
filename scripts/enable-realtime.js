require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function enableRealtime() {
  console.log('Enabling real-time replication for attendance and meetings tables...\n')
  
  // Enable real-time for attendance table
  const { data: data1, error: error1 } = await supabase.rpc('exec_sql', {
    sql: "ALTER PUBLICATION supabase_realtime ADD TABLE attendance;"
  })
  
  if (error1) {
    console.log('Note about attendance table:', error1.message)
    if (error1.message.includes('already') || error1.message.includes('exists')) {
      console.log('✓ attendance table already has real-time enabled\n')
    }
  } else {
    console.log('✅ Enabled real-time for attendance table\n')
  }
  
  // Enable real-time for meetings table
  const { data: data2, error: error2 } = await supabase.rpc('exec_sql', {
    sql: "ALTER PUBLICATION supabase_realtime ADD TABLE meetings;"
  })
  
  if (error2) {
    console.log('Note about meetings table:', error2.message)
    if (error2.message.includes('already') || error2.message.includes('exists')) {
      console.log('✓ meetings table already has real-time enabled\n')
    }
  } else {
    console.log('✅ Enabled real-time for meetings table\n')
  }
  
  // Verify
  const { data: tables, error: error3 } = await supabase.rpc('exec_sql', {
    sql: "SELECT schemaname, tablename FROM pg_publication_tables WHERE pubname = 'supabase_realtime' ORDER BY tablename;"
  })
  
  if (tables) {
    console.log('Tables with real-time enabled:')
    console.log(tables)
  }
}

enableRealtime().catch(console.error)
