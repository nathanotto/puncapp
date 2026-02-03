require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const CHAPTER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const MEETING_TIME = '12:30:00' // 12:30 PM Mountain Time

async function setupMeetings() {
  console.log('🧹 Cleaning up existing meetings and attendance...\n')

  // Delete all attendance records for Oak Chapter meetings
  const { data: oldMeetings } = await supabase
    .from('meetings')
    .select('id')
    .eq('chapter_id', CHAPTER_ID)

  if (oldMeetings && oldMeetings.length > 0) {
    const oldMeetingIds = oldMeetings.map(m => m.id)

    await supabase
      .from('attendance')
      .delete()
      .in('meeting_id', oldMeetingIds)

    console.log(`✅ Deleted attendance for ${oldMeetingIds.length} old meetings`)
  }

  // Delete all old meetings
  await supabase
    .from('meetings')
    .delete()
    .eq('chapter_id', CHAPTER_ID)

  console.log('✅ Deleted all old meetings\n')

  // Calculate meeting dates (every 2 weeks on Mondays, starting 6 weeks ago)
  const today = new Date()

  // Function to get the previous Monday from a given date
  function getPreviousMonday(date) {
    const d = new Date(date)
    const day = d.getDay()
    const diff = day === 0 ? 6 : day - 1 // If Sunday (0), go back 6 days, else go back (day - 1)
    d.setDate(d.getDate() - diff)
    return d
  }

  // Get the Monday of this week
  const thisMonday = getPreviousMonday(today)

  // Calculate meeting dates: 6, 4, 2 weeks ago, this week, and 2, 4 weeks from now
  const meetingDates = [
    new Date(thisMonday.getTime() - 6 * 7 * 24 * 60 * 60 * 1000), // 6 weeks ago
    new Date(thisMonday.getTime() - 4 * 7 * 24 * 60 * 60 * 1000), // 4 weeks ago
    new Date(thisMonday.getTime() - 2 * 7 * 24 * 60 * 60 * 1000), // 2 weeks ago
    new Date(thisMonday.getTime()), // This week
    new Date(thisMonday.getTime() + 2 * 7 * 24 * 60 * 60 * 1000), // 2 weeks from now
    new Date(thisMonday.getTime() + 4 * 7 * 24 * 60 * 60 * 1000), // 4 weeks from now
  ]

  console.log('📅 Creating meetings:\n')

  const meetings = []

  for (let i = 0; i < meetingDates.length; i++) {
    const meetingDate = meetingDates[i]
    const dateStr = meetingDate.toISOString().split('T')[0]

    // Determine status based on date
    let status = 'scheduled'
    if (meetingDate < new Date(today.getTime() - 24 * 60 * 60 * 1000)) {
      // More than 1 day ago - mark as completed
      status = 'completed'
    } else if (i === 3) {
      // This week's meeting - keep as scheduled (we'll test with this one)
      status = 'scheduled'
    }

    const rsvpDeadline = new Date(meetingDate.getTime() - 2 * 24 * 60 * 60 * 1000) // 2 days before
    const rsvpDeadlineStr = rsvpDeadline.toISOString().split('T')[0]

    const meeting = {
      chapter_id: CHAPTER_ID,
      scheduled_date: dateStr,
      scheduled_time: MEETING_TIME,
      location: '123 Main St, Austin, TX',
      status: status,
      rsvp_deadline: rsvpDeadlineStr,
    }

    meetings.push(meeting)

    const relativeTime = i < 3 ? `${(3 - i) * 2} weeks ago` : i === 3 ? 'This week' : `${(i - 3) * 2} weeks from now`
    console.log(`  ${dateStr} (${relativeTime}) - ${status}`)
  }

  const { data: createdMeetings, error } = await supabase
    .from('meetings')
    .insert(meetings)
    .select('id, scheduled_date, status')

  if (error) {
    console.error('❌ Failed to create meetings:', error)
    return
  }

  console.log(`\n✅ Created ${createdMeetings.length} meetings`)

  // Get all chapter members
  const { data: members } = await supabase
    .from('chapter_memberships')
    .select('user_id')
    .eq('chapter_id', CHAPTER_ID)
    .eq('is_active', true)

  // Create attendance records for this week's meeting (with RSVPs)
  const thisWeekMeeting = createdMeetings.find(m => m.status === 'scheduled')

  if (thisWeekMeeting && members) {
    console.log(`\n📝 Creating attendance records for this week's meeting...`)

    const threeDaysAgo = new Date(today.getTime() - 3 * 24 * 60 * 60 * 1000)

    const attendanceRecords = members.map((member, index) => {
      if (index < 6) {
        // First 6 RSVP yes
        return {
          meeting_id: thisWeekMeeting.id,
          user_id: member.user_id,
          rsvp_status: 'yes',
          rsvp_at: threeDaysAgo.toISOString(),
        }
      } else {
        // Last 2 RSVP no
        const reasons = ['Out of town for work', 'Family commitment']
        return {
          meeting_id: thisWeekMeeting.id,
          user_id: member.user_id,
          rsvp_status: 'no',
          rsvp_reason: reasons[index - 6] || 'Unable to attend',
          rsvp_at: threeDaysAgo.toISOString(),
        }
      }
    })

    const { error: attendanceError } = await supabase
      .from('attendance')
      .insert(attendanceRecords)

    if (attendanceError) {
      console.error('⚠️  Failed to create attendance:', attendanceError)
    } else {
      console.log(`✅ Created ${attendanceRecords.length} attendance records`)
    }

    // Create check-in tasks for members who RSVP'd yes
    // Include timezone offset for Mountain Time (UTC-7)
    const checkInTasks = members.slice(0, 6).map(member => ({
      task_type: 'check_in_to_meeting',
      assigned_to: member.user_id,
      related_entity_type: 'meeting',
      related_entity_id: thisWeekMeeting.id,
      due_at: `${thisWeekMeeting.scheduled_date}T${MEETING_TIME}-07:00`,
      urgency: 'normal',
      metadata: {
        meeting_id: thisWeekMeeting.id,
      },
    }))

    const { error: tasksError } = await supabase
      .from('pending_tasks')
      .insert(checkInTasks)

    if (tasksError) {
      console.error('⚠️  Failed to create tasks:', tasksError)
    } else {
      console.log(`✅ Created ${checkInTasks.length} check-in tasks`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ SETUP COMPLETE!')
  console.log('='.repeat(60))
  console.log('\n📊 Summary:')
  console.log(`  - ${createdMeetings.length} meetings created (every 2 weeks on Mondays at 12:30 PM MT)`)
  console.log(`  - Past meetings marked as completed`)
  console.log(`  - This week's meeting ready for testing`)
  console.log(`  - Attendance and tasks created for this week's meeting`)

  if (thisWeekMeeting) {
    console.log('\n🧪 Test with this week\'s meeting:')
    console.log(`  Meeting ID: ${thisWeekMeeting.id}`)
    console.log(`  Date: ${thisWeekMeeting.scheduled_date}`)
    console.log(`  Dashboard: http://localhost:3000/`)
    console.log(`  Meeting View: http://localhost:3000/meetings/${thisWeekMeeting.id}`)
  }
}

setupMeetings().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
