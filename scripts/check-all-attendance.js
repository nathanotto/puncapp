const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAttendance() {
  console.log('🔍 Checking all attendance records...\n')

  // Get all attendance records
  const { data: attendance } = await supabase
    .from('attendance')
    .select('meeting_id, user_id, checked_in_at, attendance_type, users(name)')
    .order('checked_in_at', { ascending: false })
    .limit(20)

  console.log(`Found ${attendance?.length || 0} recent attendance records:\n`)

  attendance?.forEach(a => {
    console.log(`Meeting: ${a.meeting_id.substring(0, 8)}...`)
    console.log(`  User: ${a.users.name}`)
    console.log(`  Checked in: ${a.checked_in_at || 'NOT CHECKED IN'}`)
    console.log(`  Type: ${a.attendance_type}`)
    console.log()
  })

  // Check specifically for the meetings we're interested in
  const testMeetings = [
    '49273e95-b756-48fb-a327-ff66eb75a7eb',
    '0beef3e4-f862-4a00-bd04-985cf49fc855'
  ]

  for (const meetingId of testMeetings) {
    console.log(`\nChecking attendance for meeting ${meetingId.substring(0, 8)}...`)
    const { data: meetingAttendance } = await supabase
      .from('attendance')
      .select('user_id, checked_in_at, attendance_type, users(name)')
      .eq('meeting_id', meetingId)

    console.log(`  Total records: ${meetingAttendance?.length || 0}`)
    if (meetingAttendance && meetingAttendance.length > 0) {
      meetingAttendance.forEach(a => {
        console.log(`    - ${a.users.name}: ${a.checked_in_at ? 'Checked in' : 'Not checked in'}`)
      })
    }
  }
}

checkAttendance()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
