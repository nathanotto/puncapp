require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const CHAPTER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const MEETING_ID = 'e5f6a7b8-c9d0-1234-ef01-567890123456'

async function fullReset() {
  console.log('🔄 Full reset of Session 4 test data...\n')

  // 1. Delete all pending tasks for this meeting
  console.log('Deleting pending tasks...')
  const { error: tasksError } = await supabase
    .from('pending_tasks')
    .delete()
    .eq('related_entity_type', 'meeting')
    .eq('related_entity_id', MEETING_ID)

  if (tasksError) {
    console.error('⚠️  Failed to delete tasks:', tasksError.message)
  } else {
    console.log('✅ Cleared all pending tasks')
  }

  // 2. Delete all attendance records for this meeting
  console.log('Deleting attendance records...')
  const { error: attendanceError } = await supabase
    .from('attendance')
    .delete()
    .eq('meeting_id', MEETING_ID)

  if (attendanceError) {
    console.error('❌ Failed to delete attendance:', attendanceError)
    return
  }
  console.log('✅ Cleared all attendance records')

  // 3. Reset meeting to scheduled status
  console.log('Resetting meeting...')
  const now = new Date()
  const meetingDate = now.toISOString().split('T')[0]
  const meetingTime = '19:00:00'

  const { error: meetingError } = await supabase
    .from('meetings')
    .update({
      status: 'scheduled',
      actual_start_time: null,
      started_late: false,
      scribe_id: null,
      scheduled_date: meetingDate,
      scheduled_time: meetingTime,
    })
    .eq('id', MEETING_ID)

  if (meetingError) {
    console.error('❌ Failed to reset meeting:', meetingError)
    return
  }
  console.log('✅ Reset meeting to scheduled status')
  console.log(`   Date: ${meetingDate} at ${meetingTime}`)

  // 4. Get all chapter members
  const { data: members, error: membersError } = await supabase
    .from('chapter_memberships')
    .select(`
      user_id,
      role,
      users!inner (
        id,
        name,
        username,
        email
      )
    `)
    .eq('chapter_id', CHAPTER_ID)
    .eq('is_active', true)

  if (membersError || !members) {
    console.error('❌ Failed to fetch members:', membersError)
    return
  }

  console.log(`\nFound ${members.length} chapter members`)

  // 5. Create attendance records with RSVPs (simulate they RSVP'd 3 days ago)
  console.log('\nCreating attendance records with RSVPs...')

  const threeDaysAgo = new Date(now)
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3)

  // First 6 members RSVP yes, last 2 RSVP no
  const attendanceRecords = members.map((member, index) => {
    if (index < 6) {
      // RSVP'd Yes
      return {
        meeting_id: MEETING_ID,
        user_id: member.user_id,
        rsvp_status: 'yes',
        rsvp_at: threeDaysAgo.toISOString(),
        checked_in_at: null,
        attendance_type: null,
      }
    } else {
      // RSVP'd No (with reason)
      const reasons = [
        'Out of town for work',
        'Family commitment',
      ]
      return {
        meeting_id: MEETING_ID,
        user_id: member.user_id,
        rsvp_status: 'no',
        rsvp_reason: reasons[index - 6],
        rsvp_at: threeDaysAgo.toISOString(),
        checked_in_at: null,
        attendance_type: null,
      }
    }
  })

  const { error: insertAttendanceError } = await supabase
    .from('attendance')
    .insert(attendanceRecords)

  if (insertAttendanceError) {
    console.error('❌ Failed to create attendance records:', insertAttendanceError)
    return
  }

  console.log('✅ Created attendance records:')
  console.log(`   - 6 members RSVP'd Yes`)
  console.log(`   - 2 members RSVP'd No`)

  // 6. Create pending tasks for members who RSVP'd yes (check-in tasks)
  console.log('\nCreating check-in tasks...')

  const checkInTasks = members.slice(0, 6).map(member => ({
    task_type: 'check_in_to_meeting',
    assigned_to: member.user_id,
    related_entity_type: 'meeting',
    related_entity_id: MEETING_ID,
    due_at: `${meetingDate}T${meetingTime}`,
    urgency: 'normal',
    metadata: {
      meeting_id: MEETING_ID,
    },
  }))

  const { error: tasksInsertError } = await supabase
    .from('pending_tasks')
    .insert(checkInTasks)

  if (tasksInsertError) {
    console.error('❌ Failed to create tasks:', tasksInsertError)
    return
  }

  console.log(`✅ Created ${checkInTasks.length} check-in tasks`)

  // 7. Summary
  console.log('\n' + '='.repeat(60))
  console.log('✅ FULL RESET COMPLETE!')
  console.log('='.repeat(60))
  console.log('\n📊 Current State:')
  console.log(`   - Meeting scheduled: ${meetingDate} at ${meetingTime}`)
  console.log(`   - RSVP'd Yes: 6 members`)
  console.log(`   - RSVP'd No: 2 members`)
  console.log(`   - Checked In: 0 members`)
  console.log(`   - Pending Tasks: ${checkInTasks.length} check-in tasks`)

  console.log('\n👥 Test Users (all password: testpassword123):')
  members.slice(0, 6).forEach(m => {
    console.log(`   - ${m.users.email}`)
  })

  console.log('\n🧪 Test URLs:')
  console.log(`   Dashboard: http://localhost:3000/`)
  console.log(`   Meeting View: http://localhost:3000/meetings/${MEETING_ID}`)
  console.log(`   Check-in: http://localhost:3000/tasks/meeting-cycle/check-in?meeting=${MEETING_ID}`)
  console.log(`   Start Meeting: http://localhost:3000/tasks/meeting-cycle/start-meeting?meeting=${MEETING_ID}`)
}

fullReset().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
