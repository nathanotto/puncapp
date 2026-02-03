require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const CHAPTER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

async function setMeetingTime() {
  // Get today's scheduled meeting
  const today = new Date().toISOString().split('T')[0]

  const { data: meeting } = await supabase
    .from('meetings')
    .select('id')
    .eq('chapter_id', CHAPTER_ID)
    .eq('scheduled_date', today)
    .eq('status', 'scheduled')
    .single()

  if (!meeting) {
    console.log('No meeting found for today')
    return
  }

  // Set time to 5 minutes ago (so check-in is open and we can test)
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000)
  const timeStr = fiveMinutesAgo.toTimeString().split(' ')[0]

  const { error } = await supabase
    .from('meetings')
    .update({ scheduled_time: timeStr })
    .eq('id', meeting.id)

  if (error) {
    console.error('Error:', error)
  } else {
    console.log('✅ Meeting time updated to', timeStr, '(5 minutes ago)')
    console.log('Check-in window is now open!')
    console.log('\nTest URLs:')
    console.log(`  Dashboard: http://localhost:3000/`)
    console.log(`  Meeting: http://localhost:3000/meetings/${meeting.id}`)
    console.log(`  Check-in: http://localhost:3000/tasks/meeting-cycle/check-in?meeting=${meeting.id}`)
  }
}

setMeetingTime()
