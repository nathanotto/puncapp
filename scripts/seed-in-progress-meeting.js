require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const CHAPTER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

async function seedInProgressMeeting() {
  console.log('🌱 Seeding in-progress meeting for real-time check-in test...\n')

  // Get Nathan's user ID
  const { data: nathan } = await supabase
    .from('users')
    .select('id, name')
    .eq('email', 'notto@nathanotto.com')
    .single()

  if (!nathan) {
    console.error('❌ Could not find Nathan Otto user')
    return
  }

  console.log(`Found user: ${nathan.name} (${nathan.id})`)

  // Calculate time: NOW (meeting started 5 minutes ago)
  const now = new Date()
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000)

  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  const meetingDate = `${year}-${month}-${day}`
  const meetingTime = now.toTimeString().split(' ')[0]

  console.log(`\nMeeting time: ${meetingDate} ${meetingTime}`)

  // Clean up old meetings and tasks
  console.log('\n🧹 Cleaning up ALL old data for Oak Chapter...')

  // First, set all in-progress meetings to completed
  const { data: inProgressMeetings } = await supabase
    .from('meetings')
    .update({ status: 'completed' })
    .eq('chapter_id', CHAPTER_ID)
    .eq('status', 'in_progress')
    .select('id')

  if (inProgressMeetings && inProgressMeetings.length > 0) {
    console.log(`✓ Set ${inProgressMeetings.length} in-progress meetings to completed`)
  }

  // Then get all meetings for this chapter
  const { data: oldMeetings } = await supabase
    .from('meetings')
    .select('id')
    .eq('chapter_id', CHAPTER_ID)

  if (oldMeetings && oldMeetings.length > 0) {
    // Delete related records first
    for (const meeting of oldMeetings) {
      await supabase.from('attendance').delete().eq('meeting_id', meeting.id)
      await supabase.from('meeting_time_log').delete().eq('meeting_id', meeting.id)
      await supabase.from('curriculum_responses').delete().eq('meeting_id', meeting.id)
    }
    // Then delete the meetings
    await supabase.from('meetings').delete().eq('chapter_id', CHAPTER_ID)
    console.log(`✓ Deleted ${oldMeetings.length} old meetings`)
  }

  // Clean up all pending tasks
  await supabase.from('pending_tasks').delete().eq('assigned_to', nathan.id)
  console.log('✓ Deleted all pending tasks')

  // Make Nathan the Leader
  await supabase
    .from('chapter_memberships')
    .update({ role: 'leader' })
    .eq('chapter_id', CHAPTER_ID)
    .eq('user_id', nathan.id)

  console.log('✓ Set Nathan as Leader')

  // Get a curriculum module to assign
  const { data: module } = await supabase
    .from('curriculum_modules')
    .select('id')
    .limit(1)
    .single()

  // Create in-progress meeting
  const { data: newMeeting, error: meetingError } = await supabase
    .from('meetings')
    .insert({
      chapter_id: CHAPTER_ID,
      scheduled_date: meetingDate,
      scheduled_time: meetingTime,
      location: '123 Main St, Austin, TX',
      status: 'in_progress',
      scribe_id: nathan.id,
      actual_start_time: fiveMinutesAgo.toISOString(),
      current_section: 'not_started',
      rsvp_deadline: meetingDate,
      selected_curriculum_id: module?.id || null,
    })
    .select('id')
    .single()

  if (meetingError || !newMeeting) {
    console.error('❌ Error creating meeting:', meetingError)
    return
  }

  const meetingId = newMeeting.id
  console.log(`✓ Created in-progress meeting: ${meetingId}`)

  // Get all chapter members
  const { data: members } = await supabase
    .from('chapter_memberships')
    .select('user_id, users!inner(id, name)')
    .eq('chapter_id', CHAPTER_ID)
    .eq('is_active', true)

  // Check in Nathan only
  await supabase
    .from('attendance')
    .insert({
      meeting_id: meetingId,
      user_id: nathan.id,
      rsvp_status: 'yes',
      checked_in_at: fiveMinutesAgo.toISOString(),
      attendance_type: 'in_person'
    })

  console.log(`✓ Checked in Nathan`)
  console.log(`ℹ️  Other members (${members.length - 1}) NOT checked in - test check-in with them`)

  console.log('\n' + '='.repeat(60))
  console.log('✅ IN-PROGRESS MEETING READY FOR REAL-TIME TEST!')
  console.log('='.repeat(60))
  console.log(`\nMeeting ID: ${meetingId}`)
  console.log(`Time: ${meetingDate} ${meetingTime}`)
  console.log(`Status: in_progress`)
  console.log(`Leader & Scribe: ${nathan.name}`)
  console.log(`Checked in: 1 member (Nathan)`)
  console.log(`Current section: not_started`)
  console.log(`\n📋 Test Instructions:`)
  console.log(`  1. Open meeting runner as Nathan: http://localhost:3000/meetings/${meetingId}/run`)
  console.log(`  2. Open incognito window and log in as another member`)
  console.log(`  3. Check in from incognito window: http://localhost:3000/tasks/meeting-cycle/check-in?meeting=${meetingId}`)
  console.log(`  4. Watch Nathan's screen - check-in should appear INSTANTLY (no refresh needed)`)
  console.log('\n💡 Look for console logs: "📡 Attendance change detected"')
}

seedInProgressMeeting().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
