require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const CHAPTER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

async function resetTestMeeting() {
  console.log('🔄 Resetting test meeting for Oak Chapter...\n')

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

  // Calculate time: 5 minutes from now
  const now = new Date()
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000)

  // Use local date, not UTC (to handle timezone properly)
  const year = fiveMinutesFromNow.getFullYear()
  const month = String(fiveMinutesFromNow.getMonth() + 1).padStart(2, '0')
  const day = String(fiveMinutesFromNow.getDate()).padStart(2, '0')
  const meetingDate = `${year}-${month}-${day}`
  const meetingTime = fiveMinutesFromNow.toTimeString().split(' ')[0]

  console.log(`\nMeeting time: ${meetingDate} ${meetingTime}`)

  // First, set ALL in-progress meetings back to completed
  console.log('\n🧹 Cleaning up old in-progress meetings...')
  const { data: oldInProgress } = await supabase
    .from('meetings')
    .update({ status: 'completed' })
    .eq('chapter_id', CHAPTER_ID)
    .eq('status', 'in_progress')
    .select('id')

  if (oldInProgress && oldInProgress.length > 0) {
    console.log(`✓ Set ${oldInProgress.length} old meetings to completed`)
  }

  // Find any recent meetings for Oak Chapter (last 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const sevenDaysAgoStr = `${sevenDaysAgo.getFullYear()}-${String(sevenDaysAgo.getMonth() + 1).padStart(2, '0')}-${String(sevenDaysAgo.getDate()).padStart(2, '0')}`

  const { data: recentMeetings } = await supabase
    .from('meetings')
    .select('id, scheduled_date, status')
    .eq('chapter_id', CHAPTER_ID)
    .gte('scheduled_date', sevenDaysAgoStr)

  let meetingId

  if (recentMeetings && recentMeetings.length > 0) {
    // Use the most recent meeting
    const latestMeeting = recentMeetings.sort((a, b) =>
      b.scheduled_date.localeCompare(a.scheduled_date)
    )[0]

    meetingId = latestMeeting.id
    console.log(`\nUpdating existing meeting: ${meetingId}`)
    console.log(`  Previous date: ${latestMeeting.scheduled_date}`)
    console.log(`  New date: ${meetingDate}`)

    // Clean up existing time logs
    await supabase
      .from('meeting_time_log')
      .delete()
      .eq('meeting_id', meetingId)

    // Delete existing attendance
    await supabase
      .from('attendance')
      .delete()
      .eq('meeting_id', meetingId)

    // Reset the meeting
    await supabase
      .from('meetings')
      .update({
        scheduled_date: meetingDate,
        scheduled_time: meetingTime,
        status: 'in_progress',
        scribe_id: nathan.id,
        actual_start_time: now.toISOString(),
        current_section: 'not_started'
      })
      .eq('id', meetingId)

    console.log('✓ Updated meeting to new time')
  } else {
    // Create new meeting
    const { data: newMeeting } = await supabase
      .from('meetings')
      .insert({
        chapter_id: CHAPTER_ID,
        scheduled_date: meetingDate,
        scheduled_time: meetingTime,
        location: '123 Main St, Austin, TX',
        status: 'in_progress',
        scribe_id: nathan.id,
        actual_start_time: now.toISOString(),
        current_section: 'not_started',
        rsvp_deadline: meetingDate
      })
      .select('id')
      .single()

    meetingId = newMeeting.id
    console.log(`\n✓ Created new meeting: ${meetingId}`)
  }

  // Get all chapter members
  const { data: members } = await supabase
    .from('chapter_memberships')
    .select('user_id, users!inner(id, name)')
    .eq('chapter_id', CHAPTER_ID)
    .eq('is_active', true)

  // Create attendance records for all members (checked in)
  const attendanceRecords = members.map(m => ({
    meeting_id: meetingId,
    user_id: m.user_id,
    rsvp_status: 'yes',
    checked_in_at: now.toISOString(),
    attendance_type: 'in_person'
  }))

  await supabase
    .from('attendance')
    .insert(attendanceRecords)

  console.log(`✓ Checked in ${members.length} members`)

  // Update Nathan's chapter membership to be leader
  await supabase
    .from('chapter_memberships')
    .update({ role: 'leader' })
    .eq('chapter_id', CHAPTER_ID)
    .eq('user_id', nathan.id)

  console.log('✓ Set Nathan as Leader')

  // Get chapter name for task metadata
  const { data: chapter } = await supabase
    .from('chapters')
    .select('name')
    .eq('id', CHAPTER_ID)
    .single()

  // Clean up any existing curriculum selection task for this meeting
  await supabase
    .from('pending_tasks')
    .delete()
    .eq('task_type', 'select_curriculum')
    .eq('related_entity_id', meetingId)

  // Create curriculum selection task for the Leader
  await supabase
    .from('pending_tasks')
    .insert({
      task_type: 'select_curriculum',
      assigned_to: nathan.id,
      related_entity_type: 'meeting',
      related_entity_id: meetingId,
      due_at: new Date(meetingDate).toISOString(),
      metadata: {
        chapter_id: CHAPTER_ID,
        chapter_name: chapter?.name || 'Oak Chapter',
      }
    })

  console.log('✓ Created curriculum selection task for Leader')

  // Clean up stale pending tasks for old meetings
  await supabase
    .from('pending_tasks')
    .delete()
    .eq('task_type', 'check_in_to_meeting')
    .neq('related_entity_id', meetingId)

  console.log('✓ Cleaned up old check-in tasks')

  console.log('\n' + '='.repeat(60))
  console.log('✅ TEST MEETING READY!')
  console.log('='.repeat(60))
  console.log(`\nMeeting ID: ${meetingId}`)
  console.log(`Time: ${meetingDate} ${meetingTime}`)
  console.log(`Status: in_progress`)
  console.log(`Leader & Scribe: ${nathan.name}`)
  console.log(`Checked in: ${members.length} members`)
  console.log(`Current section: not_started`)
  console.log(`\n📋 URLs:`)
  console.log(`  Meeting page: http://localhost:3000/meetings/${meetingId}`)
  console.log(`  Run meeting:  http://localhost:3000/meetings/${meetingId}/run`)
  console.log('\n💡 Refresh your browser and click "Run Meeting" to start testing!')
}

resetTestMeeting().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
