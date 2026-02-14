import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

async function resetMeeting(meetingId: string) {
  console.log(`\n🔄 Resetting meeting ${meetingId}...\n`)

  // Get meeting info
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, scheduled_date, chapter_id, chapters(id, name)')
    .eq('id', meetingId)
    .single()

  if (!meeting) {
    console.log('❌ Meeting not found')
    return
  }

  const chapterName = (meeting.chapters as any)?.name || 'Unknown'
  const chapterId = meeting.chapter_id
  console.log(`Meeting: ${chapterName} on ${meeting.scheduled_date}`)
  console.log()

  // 1. Delete time logs
  const { error: timeLogError } = await supabase
    .from('meeting_time_log')
    .delete()
    .eq('meeting_id', meetingId)

  if (timeLogError) {
    console.log('❌ Error deleting time logs:', timeLogError.message)
  } else {
    console.log('✅ Deleted all time logs')
  }

  // 2. Clear check-in timestamps (keep attendance records)
  const { error: checkInError } = await supabase
    .from('attendance')
    .update({ checked_in_at: null })
    .eq('meeting_id', meetingId)

  if (checkInError) {
    console.log('❌ Error clearing check-ins:', checkInError.message)
  } else {
    console.log('✅ Cleared all check-in timestamps')
  }

  // 3. Delete curriculum responses
  const { error: curriculumError } = await supabase
    .from('curriculum_responses')
    .delete()
    .eq('meeting_id', meetingId)

  if (curriculumError) {
    console.log('❌ Error deleting curriculum responses:', curriculumError.message)
  } else {
    console.log('✅ Deleted all curriculum responses')
  }

  // 4. Delete meeting feedback
  const { error: feedbackError } = await supabase
    .from('meeting_feedback')
    .delete()
    .eq('meeting_id', meetingId)

  if (feedbackError) {
    console.log('❌ Error deleting feedback:', feedbackError.message)
  } else {
    console.log('✅ Deleted all meeting feedback')
  }

  // 5. Reset meeting to scheduled state with current date/time
  const now = new Date()
  const nowISO = now.toISOString()
  const scheduledDate = now.toISOString().split('T')[0] // YYYY-MM-DD
  const scheduledTime = now.toTimeString().split(' ')[0].slice(0, 5) // HH:MM

  const { error: meetingError } = await supabase
    .from('meetings')
    .update({
      status: 'scheduled',
      scheduled_date: scheduledDate,
      scheduled_time: scheduledTime,
      actual_start_time: null,
      completed_at: null,
      current_section: null,
      current_timer_user_id: null,
      current_timer_start: null,
      scribe_id: null,
      curriculum_ditched: false,
    })
    .eq('id', meetingId)

  if (meetingError) {
    console.log('❌ Error resetting meeting:', meetingError.message)
  } else {
    console.log(`✅ Reset meeting to scheduled state (${scheduledTime})`)
  }

  console.log()
  console.log('✨ Meeting reset complete! All check-ins cleared.')
  console.log(`   Leader can now start the meeting from the beginning.`)
  console.log(`   Visit: http://localhost:3000/tasks/meeting-cycle/start-meeting`)
}

// Get meeting ID from command line or use default
const meetingId = process.argv[2] || '58f64345-bee2-44a6-8d9f-3586fcecdb09'

resetMeeting(meetingId)
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
