require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const MEETING_ID = 'e5f6a7b8-c9d0-1234-ef01-567890123456'

async function updateMeetingTime() {
  console.log('⏰ Updating meeting time to now...\n')

  // Set meeting to start 5 minutes ago (so check-in window is open)
  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

  const meetingDate = fiveMinutesAgo.toISOString().split('T')[0]
  const meetingTime = fiveMinutesAgo.toTimeString().split(' ')[0] // HH:MM:SS format

  const { data: meeting, error } = await supabase
    .from('meetings')
    .update({
      scheduled_date: meetingDate,
      scheduled_time: meetingTime,
    })
    .eq('id', MEETING_ID)
    .select()
    .single()

  if (error) {
    console.error('❌ Failed to update meeting:', error)
    return
  }

  console.log('✅ Meeting time updated!')
  console.log(`   Date: ${meetingDate}`)
  console.log(`   Time: ${meetingTime}`)
  console.log(`   (5 minutes ago - check-in window is open)`)

  console.log('\n🧪 Test URLs:')
  console.log(`   Check-in: http://localhost:3000/tasks/meeting-cycle/check-in?meeting=${MEETING_ID}`)
  console.log(`   Meeting View: http://localhost:3000/meetings/${MEETING_ID}`)
}

updateMeetingTime().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
