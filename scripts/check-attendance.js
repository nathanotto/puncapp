require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const MEETING_ID = 'e5f6a7b8-c9d0-1234-ef01-567890123456'

async function checkAttendance() {
  const { data, error } = await supabase
    .from('attendance')
    .select('user_id, checked_in_at, attendance_type')
    .eq('meeting_id', MEETING_ID)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Attendance records for meeting:', MEETING_ID)
  console.log('---')

  if (data.length === 0) {
    console.log('No attendance records found')
  } else {
    data.forEach(record => {
      console.log(`User: ${record.user_id}`)
      console.log(`  Checked in: ${record.checked_in_at || 'NO'}`)
      console.log(`  Type: ${record.attendance_type || 'N/A'}`)
      console.log('---')
    })
  }
}

checkAttendance().catch(console.error)
