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
  console.log('🧪 Seeding Session 4 test data (v2 - with RSVPs)...\n')

  const now = new Date()
  console.log(`Current time: ${now.toLocaleString()}`)

  const currentDate = now.toISOString().split('T')[0]
  const currentTime = now.toTimeString().split(' ')[0].substring(0, 5)

  console.log(`Using date: ${currentDate}, time: ${currentTime}\n`)

  // Get all chapter members
  const { data: members } = await supabase
    .from('chapter_memberships')
    .select('user_id, users!inner(name, username)')
    .eq('chapter_id', CHAPTER_ID)
    .eq('is_active', true)

  console.log(`Found ${members?.length || 0} chapter members\n`)

  // Meeting 1: Scheduled for RIGHT NOW (to test Start Meeting)
  console.log('Creating meeting scheduled for right now...')

  const meetingNowId = 'e5f6a7b8-c9d0-1234-ef01-567890123456'

  await supabase.from('meetings').upsert({
    id: meetingNowId,
    chapter_id: CHAPTER_ID,
    scheduled_date: currentDate,
    scheduled_time: currentTime,
    location: '123 Main St, Austin, TX',
    status: 'scheduled',
    rsvp_deadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  })

  console.log('  ✅ Meeting created')

  // Create RSVPs for all members (simulating they RSVP'd days ago)
  const rsvpTime = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000) // 3 days ago

  let rsvpYes = 0, rsvpNo = 0, rsvpNoResponse = 0

  for (let i = 0; i < members.length; i++) {
    const member = members[i]
    let rsvpStatus, rsvpReason = null

    // You: yes
    // First 5 others: yes
    // Next 2: no (with reasons)
    // Last 1: no_response
    if (member.user_id === YOUR_USER_ID) {
      rsvpStatus = 'yes'
      rsvpYes++
    } else if (i < 6) {
      rsvpStatus = 'yes'
      rsvpYes++
    } else if (i < 8) {
      rsvpStatus = 'no'
      rsvpNo++
      rsvpReason = i === 6 ? 'Out of town for work' : 'Family commitment'
    } else {
      rsvpStatus = 'no_response'
      rsvpNoResponse++
    }

    await supabase.from('attendance').upsert({
      meeting_id: meetingNowId,
      user_id: member.user_id,
      rsvp_status: rsvpStatus,
      rsvp_at: rsvpStatus !== 'no_response' ? rsvpTime.toISOString() : null,
      rsvp_reason: rsvpReason,
    }, {
      onConflict: 'meeting_id,user_id'
    })
  }

  console.log(`  ✅ RSVPs created: ${rsvpYes} yes, ${rsvpNo} no, ${rsvpNoResponse} no response`)

  // Now check in 3 of the "yes" people (including you)
  const yesMembers = members.filter((m, i) => m.user_id === YOUR_USER_ID || (i < 6 && m.user_id !== YOUR_USER_ID))

  // Check in yourself + 2 others
  const toCheckIn = [
    { user_id: YOUR_USER_ID, type: 'in_person' },
    { user_id: yesMembers[1]?.user_id, type: 'in_person' },
    { user_id: yesMembers[2]?.user_id, type: 'video' },
  ].filter(c => c.user_id) // Filter out undefined

  const checkInTime = new Date(now.getTime() - 5 * 60 * 1000) // 5 min ago

  for (const { user_id, type } of toCheckIn) {
    await supabase.from('attendance').update({
      checked_in_at: checkInTime.toISOString(),
      attendance_type: type,
    })
    .eq('meeting_id', meetingNowId)
    .eq('user_id', user_id)
  }

  console.log(`  ✅ ${toCheckIn.length} members checked in`)
  console.log('')

  // Meeting 2: 15 minutes AGO (to test late start)
  console.log('Creating meeting 15 minutes ago (for late start test)...')

  const fifteenMinutesAgo = new Date(now.getTime() - 15 * 60 * 1000)
  const fifteenMinAgoTime = fifteenMinutesAgo.toTimeString().split(' ')[0].substring(0, 5)

  const meetingLateId = 'a7b8c9d0-e1f2-3456-0123-789012345678'

  await supabase.from('meetings').upsert({
    id: meetingLateId,
    chapter_id: CHAPTER_ID,
    scheduled_date: currentDate,
    scheduled_time: fifteenMinAgoTime,
    location: '123 Main St, Austin, TX',
    status: 'scheduled',
    rsvp_deadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
  })

  console.log('  ✅ Meeting created')

  // Similar RSVPs for this meeting
  for (let i = 0; i < members.length; i++) {
    const member = members[i]
    let rsvpStatus, rsvpReason = null

    if (member.user_id === YOUR_USER_ID || i < 6) {
      rsvpStatus = 'yes'
    } else if (i < 8) {
      rsvpStatus = 'no'
      rsvpReason = i === 6 ? 'Out of town' : 'Family emergency'
    } else {
      rsvpStatus = 'no_response'
    }

    await supabase.from('attendance').upsert({
      meeting_id: meetingLateId,
      user_id: member.user_id,
      rsvp_status: rsvpStatus,
      rsvp_at: rsvpStatus !== 'no_response' ? rsvpTime.toISOString() : null,
      rsvp_reason: rsvpReason,
    }, {
      onConflict: 'meeting_id,user_id'
    })
  }

  console.log('  ✅ RSVPs created')
  console.log('')

  // Make sure you're a leader
  await supabase
    .from('chapter_memberships')
    .update({ role: 'leader' })
    .eq('user_id', YOUR_USER_ID)
    .eq('chapter_id', CHAPTER_ID)

  console.log('✅ Session 4 test data seeded!\n')
  console.log('📋 Summary:\n')
  console.log(`Meeting NOW (${currentTime}):`)
  console.log(`  • ${rsvpYes} RSVP'd Yes, ${toCheckIn.length} checked in`)
  console.log(`  • ${rsvpNo} RSVP'd No (with reasons)`)
  console.log(`  • ${rsvpNoResponse} No Response`)
  console.log(`  • ${rsvpYes - toCheckIn.length} said Yes but haven't checked in yet\n`)
  console.log('Meeting 15 min ago (for late start):')
  console.log(`  • Same RSVP pattern`)
  console.log(`  • No one checked in yet\n`)
  console.log('🧪 Test URLs:\n')
  console.log('Start Meeting (now):')
  console.log(`http://localhost:3000/tasks/meeting-cycle/start-meeting?meeting=${meetingNowId}\n`)
  console.log('Late Start (15 min ago):')
  console.log(`http://localhost:3000/tasks/meeting-cycle/start-meeting?meeting=${meetingLateId}\n`)
}

seedSession4Test().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
