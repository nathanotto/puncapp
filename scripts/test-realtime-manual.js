require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const MEETING_ID = 'e5f6a7b8-c9d0-1234-ef01-567890123456'

async function testRealtime() {
  console.log('Testing real-time by manually updating attendance...\n')

  // Get first attendance record
  const { data: attendance } = await supabase
    .from('attendance')
    .select('id, user_id, users!attendance_user_id_fkey(name)')
    .eq('meeting_id', MEETING_ID)
    .limit(1)
    .single()

  if (!attendance) {
    console.log('No attendance records found')
    return
  }

  console.log('User:', attendance.users.name)
  console.log('Attendance ID:', attendance.id)
  console.log('\nUpdating to trigger real-time event...')

  // Update to trigger real-time
  const { error } = await supabase
    .from('attendance')
    .update({
      checked_in_at: new Date().toISOString(),
      attendance_type: 'in_person',
    })
    .eq('id', attendance.id)

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('✅ Updated!')
    console.log('\nCheck your main browser window console.')
    console.log('You should see: 🔔 Attendance change detected!')
  }
}

testRealtime()
