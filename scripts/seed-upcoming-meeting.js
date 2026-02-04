require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const CHAPTER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

async function seedUpcomingMeeting() {
  console.log('🌱 Seeding upcoming meeting for curriculum selection test...\n')

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

  // Calculate time: 3 days from now
  const now = new Date()
  const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  // Use local date, not UTC
  const year = threeDaysFromNow.getFullYear()
  const month = String(threeDaysFromNow.getMonth() + 1).padStart(2, '0')
  const day = String(threeDaysFromNow.getDate()).padStart(2, '0')
  const meetingDate = `${year}-${month}-${day}`
  const meetingTime = '19:00:00' // 7:00 PM

  console.log(`\nMeeting time: ${meetingDate} ${meetingTime}`)

  // Clean up old meetings and tasks
  console.log('\n🧹 Cleaning up old data...')

  // Delete old meetings for this chapter
  const { data: oldMeetings } = await supabase
    .from('meetings')
    .select('id')
    .eq('chapter_id', CHAPTER_ID)

  if (oldMeetings && oldMeetings.length > 0) {
    for (const meeting of oldMeetings) {
      // Delete attendance records
      await supabase.from('attendance').delete().eq('meeting_id', meeting.id)
      // Delete time logs
      await supabase.from('meeting_time_log').delete().eq('meeting_id', meeting.id)
      // Delete curriculum responses
      await supabase.from('curriculum_responses').delete().eq('meeting_id', meeting.id)
    }
    // Delete the meetings
    await supabase.from('meetings').delete().eq('chapter_id', CHAPTER_ID)
    console.log(`✓ Deleted ${oldMeetings.length} old meetings`)
  }

  // Delete old pending tasks
  await supabase
    .from('pending_tasks')
    .delete()
    .eq('assigned_to', nathan.id)
  console.log('✓ Deleted old pending tasks')

  // Make Nathan the Leader of Oak Chapter
  await supabase
    .from('chapter_memberships')
    .update({ role: 'leader' })
    .eq('chapter_id', CHAPTER_ID)
    .eq('user_id', nathan.id)

  console.log('✓ Set Nathan as Leader')

  // Create new scheduled meeting (3 days from now)
  const { data: newMeeting, error: meetingError } = await supabase
    .from('meetings')
    .insert({
      chapter_id: CHAPTER_ID,
      scheduled_date: meetingDate,
      scheduled_time: meetingTime,
      location: '123 Main St, Austin, TX',
      status: 'scheduled',
      rsvp_deadline: meetingDate,
      selected_curriculum_id: null, // No curriculum selected yet
    })
    .select('id')
    .single()

  if (meetingError || !newMeeting) {
    console.error('❌ Error creating meeting:', meetingError)
    return
  }

  const meetingId = newMeeting.id
  console.log(`✓ Created scheduled meeting: ${meetingId}`)

  // Get chapter name for task metadata
  const { data: chapter } = await supabase
    .from('chapters')
    .select('name')
    .eq('id', CHAPTER_ID)
    .single()

  // Create curriculum selection task for Nathan (the Leader)
  const { error: taskError } = await supabase
    .from('pending_tasks')
    .insert({
      task_type: 'select_curriculum',
      assigned_to: nathan.id,
      related_entity_type: 'meeting',
      related_entity_id: meetingId,
      due_at: threeDaysFromNow.toISOString(), // Due on meeting date
      metadata: {
        chapter_id: CHAPTER_ID,
        chapter_name: chapter?.name || 'Oak Chapter',
      }
    })

  if (taskError) {
    console.error('❌ Error creating task:', taskError)
    return
  }

  console.log('✓ Created curriculum selection task for Leader')

  console.log('\n' + '='.repeat(60))
  console.log('✅ UPCOMING MEETING READY FOR CURRICULUM SELECTION!')
  console.log('='.repeat(60))
  console.log(`\nMeeting ID: ${meetingId}`)
  console.log(`Date: ${meetingDate} at ${meetingTime}`)
  console.log(`Status: scheduled (3 days from now)`)
  console.log(`Leader: ${nathan.name}`)
  console.log(`Curriculum: Not yet selected`)
  console.log(`\n📋 URLs:`)
  console.log(`  Dashboard:    http://localhost:3000/`)
  console.log(`  Meeting page: http://localhost:3000/meetings/${meetingId}`)
  console.log('\n💡 Log in and check your dashboard. You should see "Select Curriculum" task!')
}

seedUpcomingMeeting().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
