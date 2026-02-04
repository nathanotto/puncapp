const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkMeeting() {
  const meetingId = '49273e95-b756-48fb-a327-ff66eb75a7eb'

  console.log('🔍 Checking meeting:', meetingId, '\n')

  // Get meeting details
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, scheduled_date, scheduled_time, status, actual_start_time, completed_at, current_section')
    .eq('id', meetingId)
    .single()

  console.log('Meeting Details:')
  console.log('  Status:', meeting.status)
  console.log('  Started:', meeting.actual_start_time || 'Never')
  console.log('  Completed:', meeting.completed_at || 'Never')
  console.log('  Current Section:', meeting.current_section)
  console.log()

  // Get attendees
  const { data: attendees } = await supabase
    .from('attendance')
    .select('user_id, checked_in_at, users(name)')
    .eq('meeting_id', meetingId)
    .not('checked_in_at', 'is', null)

  console.log(`Attendees (${attendees?.length || 0}):`)
  attendees?.forEach(a => console.log(`  - ${a.users.name}`))
  console.log()

  if (!attendees || attendees.length === 0) {
    console.log('❌ NO ATTENDEES - Cannot be complete\n')
    return
  }

  // Check lightning round
  const { data: lightningLogs } = await supabase
    .from('meeting_time_log')
    .select('user_id, skipped, duration_seconds')
    .eq('meeting_id', meetingId)
    .eq('section', 'lightning_round')
    .not('user_id', 'is', null)

  console.log(`Lightning Round Logs (${lightningLogs?.length || 0}):`)
  lightningLogs?.forEach(l => {
    const attendee = attendees.find(a => a.user_id === l.user_id)
    console.log(`  - ${attendee?.users.name}: ${l.skipped ? 'SKIPPED' : l.duration_seconds + 's'}`)
  })

  const lightningUserIds = new Set(lightningLogs?.map(l => l.user_id) || [])
  const missingLightning = attendees.filter(a => !lightningUserIds.has(a.user_id))

  if (missingLightning.length > 0) {
    console.log(`  ❌ Missing lightning: ${missingLightning.map(m => m.users.name).join(', ')}`)
  } else {
    console.log(`  ✓ All attendees completed lightning round`)
  }
  console.log()

  // Check full checkins
  const { data: checkinLogs } = await supabase
    .from('meeting_time_log')
    .select('user_id, skipped, duration_seconds')
    .eq('meeting_id', meetingId)
    .eq('section', 'full_checkins')
    .not('user_id', 'is', null)

  console.log(`Full Check-in Logs (${checkinLogs?.length || 0}):`)
  checkinLogs?.forEach(l => {
    const attendee = attendees.find(a => a.user_id === l.user_id)
    console.log(`  - ${attendee?.users.name}: ${l.skipped ? 'SKIPPED' : l.duration_seconds + 's'}`)
  })

  const checkinUserIds = new Set(checkinLogs?.map(l => l.user_id) || [])
  const missingCheckins = attendees.filter(a => !checkinUserIds.has(a.user_id))

  if (missingCheckins.length > 0) {
    console.log(`  ❌ Missing checkins: ${missingCheckins.map(m => m.users.name).join(', ')}`)
  } else {
    console.log(`  ✓ All attendees completed full check-in`)
  }
  console.log()

  // Check closing section
  const { data: closingLog } = await supabase
    .from('meeting_time_log')
    .select('start_time, end_time')
    .eq('meeting_id', meetingId)
    .eq('section', 'closing')
    .is('user_id', null)
    .single()

  console.log('Closing Section:')
  if (closingLog) {
    console.log(`  Started: ${closingLog.start_time}`)
    console.log(`  Ended: ${closingLog.end_time || 'Still open'}`)
  } else {
    console.log(`  ❌ No closing section logged`)
  }
  console.log()

  // Determine if should be complete
  const hasAttendees = attendees && attendees.length > 0
  const allDidLightning = missingLightning.length === 0
  const allDidCheckin = missingCheckins.length === 0
  const closingCompleted = closingLog && closingLog.end_time

  console.log('Completion Criteria:')
  console.log(`  ✓ Has attendees: ${hasAttendees}`)
  console.log(`  ${allDidLightning ? '✓' : '❌'} All did lightning: ${allDidLightning}`)
  console.log(`  ${allDidCheckin ? '✓' : '❌'} All did checkin: ${allDidCheckin}`)
  console.log(`  ${closingCompleted ? '✓' : '❌'} Closing completed: ${closingCompleted}`)
  console.log()

  if (hasAttendees && allDidLightning && allDidCheckin) {
    console.log('✅ SHOULD BE MARKED AS COMPLETE!')
    console.log(`   But completed_at is: ${meeting.completed_at || 'null'}`)

    if (!meeting.completed_at) {
      console.log('\n🔧 Fixing: Setting completed_at to now...')
      const now = new Date().toISOString()
      await supabase
        .from('meetings')
        .update({
          status: 'completed',
          completed_at: now,
          current_section: 'ended'
        })
        .eq('id', meetingId)
      console.log('✓ Fixed!')
    }
  } else {
    console.log('❌ Should NOT be marked complete - missing data')
  }
}

checkMeeting()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
