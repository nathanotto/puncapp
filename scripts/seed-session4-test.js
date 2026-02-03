require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const YOUR_USER_ID = '78d0b1d5-08a6-4923-8bef-49d804cafa73'
const CHAPTER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

async function seedSession4Test() {
  console.log('🧪 Seeding Session 4 test data...\n')

  const now = new Date()
  console.log(`Current time: ${now.toLocaleString()}`)

  const currentDate = now.toISOString().split('T')[0]
  const currentTime = now.toTimeString().split(' ')[0].substring(0, 5) // HH:MM format

  console.log(`Using date: ${currentDate}, time: ${currentTime}\n`)

  // Meeting 1: Scheduled for RIGHT NOW (to test Start Meeting)
  console.log('Creating meeting scheduled for right now (to test Start Meeting)...')

  const meetingNowId = 'e5f6a7b8-c9d0-1234-ef01-567890123456'

  const { error: meeting1Error } = await supabase
    .from('meetings')
    .upsert({
      id: meetingNowId,
      chapter_id: CHAPTER_ID,
      scheduled_date: currentDate,
      scheduled_time: currentTime,
      location: '123 Main St, Austin, TX',
      status: 'scheduled',
      rsvp_deadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    })

  if (meeting1Error) {
    console.log('  ⚠️  Meeting creation failed:', meeting1Error.message)
  } else {
    console.log('  ✅ Meeting created (scheduled for now)')
  }

  // Create attendance record for you (RSVP yes, not checked in yet)
  const { error: attendance1Error } = await supabase
    .from('attendance')
    .upsert({
      meeting_id: meetingNowId,
      user_id: YOUR_USER_ID,
      rsvp_status: 'yes',
    }, {
      onConflict: 'meeting_id,user_id'
    })

  if (attendance1Error) {
    console.log('  ⚠️  Attendance creation failed:', attendance1Error.message)
  } else {
    console.log('  ✅ Attendance created (RSVP: yes, not checked in)')
  }

  console.log('')

  // Meeting 2: Scheduled 10 minutes from now (to test check-in window)
  console.log('Creating meeting 10 minutes from now (to test check-in window)...')

  const tenMinutesFromNow = new Date(now.getTime() + 10 * 60 * 1000)
  const tenMinTime = tenMinutesFromNow.toTimeString().split(' ')[0].substring(0, 5)

  const meeting10MinId = 'f6a7b8c9-d0e1-2345-f012-678901234567'

  const { error: meeting2Error } = await supabase
    .from('meetings')
    .upsert({
      id: meeting10MinId,
      chapter_id: CHAPTER_ID,
      scheduled_date: currentDate,
      scheduled_time: tenMinTime,
      location: '123 Main St, Austin, TX',
      status: 'scheduled',
      rsvp_deadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    })

  if (meeting2Error) {
    console.log('  ⚠️  Meeting creation failed:', meeting2Error.message)
  } else {
    console.log('  ✅ Meeting created (scheduled 10 min from now)')
  }

  const { error: attendance2Error } = await supabase
    .from('attendance')
    .upsert({
      meeting_id: meeting10MinId,
      user_id: YOUR_USER_ID,
      rsvp_status: 'yes',
    }, {
      onConflict: 'meeting_id,user_id'
    })

  if (attendance2Error) {
    console.log('  ⚠️  Attendance creation failed:', attendance2Error.message)
  } else {
    console.log('  ✅ Attendance created')
  }

  console.log('')

  // Meeting 3: Scheduled 15 minutes AGO (to test late start)
  console.log('Creating meeting 15 minutes ago (to test late start)...')

  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
  const fifteenMinAgoTime = fifteenMinutesAgo.toTimeString().split(' ')[0].substring(0, 5)

  const meetingLateId = 'a7b8c9d0-e1f2-3456-0123-789012345678'

  const { error: meeting3Error } = await supabase
    .from('meetings')
    .upsert({
      id: meetingLateId,
      chapter_id: CHAPTER_ID,
      scheduled_date: currentDate,
      scheduled_time: fifteenMinAgoTime,
      location: '123 Main St, Austin, TX',
      status: 'scheduled',
      rsvp_deadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    })

  if (meeting3Error) {
    console.log('  ⚠️  Meeting creation failed:', meeting3Error.message)
  } else {
    console.log('  ✅ Meeting created (scheduled 15 min ago)')
  }

  const { error: attendance3Error } = await supabase
    .from('attendance')
    .upsert({
      meeting_id: meetingLateId,
      user_id: YOUR_USER_ID,
      rsvp_status: 'yes',
    }, {
      onConflict: 'meeting_id,user_id'
    })

  if (attendance3Error) {
    console.log('  ⚠️  Attendance creation failed:', attendance3Error.message)
  } else {
    console.log('  ✅ Attendance created')
  }

  console.log('')

  // Make sure you're a leader
  console.log('Ensuring you are a leader...')

  const { error: leaderError } = await supabase
    .from('chapter_memberships')
    .update({ role: 'leader' })
    .eq('user_id', YOUR_USER_ID)
    .eq('chapter_id', CHAPTER_ID)

  if (leaderError) {
    console.log('  ⚠️  Leader role update failed:', leaderError.message)
  } else {
    console.log('  ✅ You are a leader')
  }

  console.log('')
  console.log('✅ Session 4 test data seeded!')
  console.log('')
  console.log('📋 Test Instructions:')
  console.log('')
  console.log('Test A: Check-in Window (Meeting 10 min from now)')
  console.log(`  1. Go to: /tasks/meeting-cycle/check-in?meeting=${meeting10MinId}`)
  console.log('  2. Should show "Check-in opens at [time]" (disabled)')
  console.log('  3. Wait until 5 minutes from meeting time (window opens 15 min before)')
  console.log('  4. Refresh - button should now be enabled')
  console.log('  5. Click "In Person" or "Video" to check in')
  console.log('')
  console.log('Test B: Start Meeting (Meeting scheduled now)')
  console.log(`  1. Go to: /tasks/meeting-cycle/start-meeting?meeting=${meetingNowId}`)
  console.log('  2. Should show attendance summary (0 checked in)')
  console.log('  3. Select yourself as Scribe')
  console.log('  4. Click "Start Meeting"')
  console.log('  5. Meeting status should change to "in_progress"')
  console.log('')
  console.log('Test C: Late Start (Meeting scheduled 15 min ago)')
  console.log(`  1. Go to: /tasks/meeting-cycle/start-meeting?meeting=${meetingLateId}`)
  console.log('  2. Should show warning: "Meeting is starting 15 minutes late"')
  console.log('  3. Start the meeting')
  console.log('  4. Leadership log should record the late start')
  console.log('')
  console.log('Test D: Check-in After Start')
  console.log('  1. Start a meeting (Test B or C)')
  console.log('  2. Go to check-in page for that meeting')
  console.log('  3. Check in')
  console.log('  4. If >10 min after start: should log as late check-in')
  console.log('')
}

seedSession4Test().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
