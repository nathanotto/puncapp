const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function validateMeetingCompleteness() {
  console.log('🔍 Validating meeting completeness...\n')

  // Get all meetings that need validation
  const { data: meetings, error } = await supabase
    .from('meetings')
    .select('id, scheduled_date, scheduled_time, status, actual_start_time, completed_at, chapter_id')
    .in('status', ['completed', 'incomplete', 'never_started'])
    .order('scheduled_date', { ascending: false })

  if (error) {
    console.error('Error fetching meetings:', error)
    return
  }

  console.log(`Found ${meetings.length} meetings to validate\n`)

  for (const meeting of meetings) {
    console.log(`\n${'='.repeat(80)}`)
    console.log(`Meeting: ${meeting.id}`)
    console.log(`Date: ${meeting.scheduled_date} ${meeting.scheduled_time}`)
    console.log(`Started: ${meeting.actual_start_time || 'Never'}`)
    console.log(`Completed: ${meeting.completed_at || 'Never'}`)

    // Check if meeting was never started
    if (!meeting.actual_start_time) {
      console.log('❌ Status: NEVER STARTED (no actual_start_time)')
      await updateMeetingStatus(meeting.id, 'never_started')
      continue
    }

    // Check if meeting was not properly completed
    if (!meeting.completed_at) {
      console.log('❌ Status: INCOMPLETE (started but not completed)')
      await updateMeetingStatus(meeting.id, 'incomplete')
      continue
    }

    // Get attendees - check both attendance table AND time logs
    const { data: attendanceRecords } = await supabase
      .from('attendance')
      .select('user_id, users(name)')
      .eq('meeting_id', meeting.id)
      .not('checked_in_at', 'is', null)

    // Also get attendees from time logs (in case attendance wasn't properly recorded)
    const { data: lightningLogsForAttendees } = await supabase
      .from('meeting_time_log')
      .select('user_id')
      .eq('meeting_id', meeting.id)
      .eq('section', 'lightning_round')
      .not('user_id', 'is', null)

    // Combine both sources
    const attendeeUserIds = new Set()
    attendanceRecords?.forEach(a => attendeeUserIds.add(a.user_id))
    lightningLogsForAttendees?.forEach(l => attendeeUserIds.add(l.user_id))

    const attendees = Array.from(attendeeUserIds).map(user_id => ({ user_id, users: { name: user_id.substring(0, 8) + '...' } }))

    if (attendees.length === 0) {
      console.log('❌ Status: INCOMPLETE (no attendees/participants)')
      await updateMeetingStatus(meeting.id, 'incomplete')
      continue
    }

    console.log(`✓ Has ${attendees.length} participants (from attendance and/or time logs)`)

    // Check lightning round participation
    const { data: lightningLogs } = await supabase
      .from('meeting_time_log')
      .select('user_id, skipped')
      .eq('meeting_id', meeting.id)
      .eq('section', 'lightning_round')
      .not('user_id', 'is', null)

    const lightningUserIds = new Set(lightningLogs?.map(l => l.user_id) || [])
    const allDidLightning = attendees.every(a => lightningUserIds.has(a.user_id))

    if (!allDidLightning) {
      const missing = attendees.filter(a => !lightningUserIds.has(a.user_id))
      console.log(`❌ Lightning Round incomplete. Missing: ${missing.map(m => m.users.name).join(', ')}`)
      await updateMeetingStatus(meeting.id, 'incomplete')
      continue
    }

    console.log(`✓ All attendees completed Lightning Round`)

    // Check full checkins participation
    const { data: checkinLogs } = await supabase
      .from('meeting_time_log')
      .select('user_id, skipped')
      .eq('meeting_id', meeting.id)
      .eq('section', 'full_checkins')
      .not('user_id', 'is', null)

    const checkinUserIds = new Set(checkinLogs?.map(l => l.user_id) || [])
    const allDidCheckin = attendees.every(a => checkinUserIds.has(a.user_id))

    if (!allDidCheckin) {
      const missing = attendees.filter(a => !checkinUserIds.has(a.user_id))
      console.log(`❌ Full Check-ins incomplete. Missing: ${missing.map(m => m.users.name).join(', ')}`)
      await updateMeetingStatus(meeting.id, 'incomplete')
      continue
    }

    console.log(`✓ All attendees completed Full Check-in`)

    // All criteria met - mark as completed
    console.log(`✅ Status: TRULY COMPLETED`)

    if (meeting.status !== 'completed' || !meeting.completed_at) {
      console.log(`  → Updating status to completed`)
      const now = new Date().toISOString()
      await supabase
        .from('meetings')
        .update({
          status: 'completed',
          completed_at: meeting.completed_at || now,
          current_section: 'ended'
        })
        .eq('id', meeting.id)
    }
  }

  console.log('\n' + '='.repeat(80))
  console.log('✓ Validation complete!')
}

async function updateMeetingStatus(meetingId, newStatus) {
  const { error } = await supabase
    .from('meetings')
    .update({ status: newStatus })
    .eq('id', meetingId)

  if (error) {
    console.error(`  Error updating status:`, error)
  } else {
    console.log(`  → Updated status to: ${newStatus}`)
  }
}

validateMeetingCompleteness()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
