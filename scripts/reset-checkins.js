require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const MEETING_ID = 'e5f6a7b8-c9d0-1234-ef01-567890123456'

async function resetCheckins() {
  console.log('🔄 Resetting check-in data for testing...\n')

  // Reset attendance records - clear check-ins but keep RSVPs
  const { error: attendanceError } = await supabase
    .from('attendance')
    .update({
      checked_in_at: null,
      checked_in_late: false,
      attendance_type: null,
    })
    .eq('meeting_id', MEETING_ID)

  if (attendanceError) {
    console.error('❌ Failed to reset attendance:', attendanceError)
    return
  }

  console.log('✅ Cleared all check-ins (RSVPs kept intact)')

  // Reset meeting to scheduled status
  const { error: meetingError } = await supabase
    .from('meetings')
    .update({
      status: 'scheduled',
      actual_start_time: null,
      started_late: false,
      scribe_id: null,
    })
    .eq('id', MEETING_ID)

  if (meetingError) {
    console.error('❌ Failed to reset meeting:', meetingError)
    return
  }

  console.log('✅ Reset meeting to scheduled status')

  // Get current state
  const { data: attendance } = await supabase
    .from('attendance')
    .select(`
      rsvp_status,
      checked_in_at,
      users!attendance_user_id_fkey (name, username)
    `)
    .eq('meeting_id', MEETING_ID)

  console.log('\n📊 Current State:')
  console.log('================')

  const rsvpYes = attendance?.filter(a => a.rsvp_status === 'yes').length || 0
  const rsvpNo = attendance?.filter(a => a.rsvp_status === 'no').length || 0
  const checkedIn = attendance?.filter(a => a.checked_in_at).length || 0

  console.log(`RSVP'd Yes: ${rsvpYes}`)
  console.log(`RSVP'd No: ${rsvpNo}`)
  console.log(`Checked In: ${checkedIn}`)

  console.log('\n✅ Ready to test real-time check-ins!')
  console.log('\nTest URLs:')
  console.log(`Meeting View: http://localhost:3000/meetings/${MEETING_ID}`)
  console.log(`Check-in: http://localhost:3000/tasks/meeting-cycle/check-in?meeting=${MEETING_ID}`)
  console.log(`Start Meeting: http://localhost:3000/tasks/meeting-cycle/start-meeting?meeting=${MEETING_ID}`)
}

resetCheckins().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
