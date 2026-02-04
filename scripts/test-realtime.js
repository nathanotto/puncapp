require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

const supabase = createClient(supabaseUrl, supabaseAnonKey)

async function testRealtime() {
  console.log('🧪 Testing Realtime Setup...\n')

  // Check if tables are in publication
  const { data, error } = await supabase
    .rpc('pg_publication_tables', {})
    .eq('pubname', 'supabase_realtime')

  if (error) {
    console.log('ℹ️  Could not query publication directly')
  }

  console.log('📡 Setting up test subscription on attendance table...')

  const channel = supabase
    .channel('test-realtime')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'attendance',
      },
      (payload) => {
        console.log('✅ REALTIME EVENT RECEIVED:', payload)
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status)
      if (status === 'SUBSCRIBED') {
        console.log('\n✅ Successfully subscribed to attendance changes!')
        console.log('👉 Now go check in a user and watch for events...')
        console.log('   (Press Ctrl+C to exit)\n')
      } else if (status === 'CHANNEL_ERROR') {
        console.log('\n❌ Channel error - realtime might not be enabled')
        console.log('   Check Supabase Dashboard -> Database -> Replication\n')
      }
    })

  // Keep the script running
  process.on('SIGINT', () => {
    console.log('\n\n👋 Closing subscription...')
    supabase.removeChannel(channel)
    process.exit(0)
  })
}

testRealtime()
