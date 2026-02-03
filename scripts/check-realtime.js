require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRealtime() {
  console.log('Testing real-time subscription...\n')
  
  const channel = supabase
    .channel('test-attendance')
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'attendance',
      },
      (payload) => {
        console.log('✅ Received real-time event!', payload.eventType)
        console.log('Data:', payload.new)
        process.exit(0)
      }
    )
    .subscribe((status) => {
      console.log('Subscription status:', status)
      if (status === 'SUBSCRIBED') {
        console.log('\n✅ Real-time subscription is active!')
        console.log('Now testing with a database update...\n')
        
        // Try to update an attendance record to trigger the event
        setTimeout(async () => {
          const { data: attendance } = await supabase
            .from('attendance')
            .select('id')
            .limit(1)
            .single()
          
          if (attendance) {
            console.log('Updating attendance record:', attendance.id)
            await supabase
              .from('attendance')
              .update({ updated_at: new Date().toISOString() })
              .eq('id', attendance.id)
            
            console.log('Waiting for real-time event...')
            
            setTimeout(() => {
              console.log('\n❌ No event received after 5 seconds')
              console.log('\n⚠️ Real-time replication is NOT enabled for the attendance table.')
              console.log('\nTo enable it:')
              console.log('1. Go to https://supabase.com/dashboard/project/krfbavajdsgehhfngpcs')
              console.log('2. Go to Database → Replication')
              console.log('3. Find the "attendance" table')
              console.log('4. Toggle ON the replication switch')
              console.log('5. Do the same for the "meetings" table')
              process.exit(1)
            }, 5000)
          }
        }, 2000)
      }
    })
}

checkRealtime()
