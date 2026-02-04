require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const CHAPTER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

async function seedRemainingFeedback() {
  console.log('🌱 Seeding remaining feedback for Anderson and Rodriguez...\n')

  // Get the in-progress meeting
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('id, chapter_id')
    .eq('chapter_id', CHAPTER_ID)
    .eq('status', 'in_progress')
    .single()

  if (meetingError || !meeting) {
    console.error('❌ No in-progress meeting found for Oak Chapter')
    return
  }

  console.log(`Found meeting: ${meeting.id}`)

  // Get all checked-in attendees
  const { data: attendees } = await supabase
    .from('attendance')
    .select(`
      user_id,
      users!attendance_user_id_fkey(id, name, email)
    `)
    .eq('meeting_id', meeting.id)
    .not('checked_in_at', 'is', null)

  if (!attendees || attendees.length === 0) {
    console.error('❌ No checked-in attendees found')
    return
  }

  // Find Michael Anderson and James Rodriguez
  const targetUsers = [
    'michael.anderson@example.com',
    'james.rodriguez@example.com'
  ]

  const usersToSeed = attendees.filter(a =>
    targetUsers.includes(a.users.email)
  )

  if (usersToSeed.length === 0) {
    console.error('❌ Could not find Anderson or Rodriguez')
    console.log('Available attendees:')
    attendees.forEach(a => console.log(`  - ${a.users.name} (${a.users.email})`))
    return
  }

  console.log(`\nSeeding feedback for ${usersToSeed.length} attendees:`)

  for (const attendee of usersToSeed) {
    // Pick a random rating between 7-10 (good meetings!)
    const rating = Math.floor(Math.random() * 4) + 7

    // Pick a random other attendee for "most value"
    const otherAttendees = attendees.filter(a => a.user_id !== attendee.user_id)
    const mostValuePerson = otherAttendees[Math.floor(Math.random() * otherAttendees.length)]

    const { error: feedbackError } = await supabase
      .from('meeting_feedback')
      .upsert({
        meeting_id: meeting.id,
        user_id: attendee.user_id,
        value_rating: rating,
        skipped_rating: false,
        most_value_user_id: mostValuePerson.user_id,
        skipped_most_value: false,
      }, {
        onConflict: 'meeting_id,user_id'
      })

    if (feedbackError) {
      console.error(`❌ Error for ${attendee.users.name}:`, feedbackError)
    } else {
      console.log(`✓ ${attendee.users.name}: Rating ${rating}/10, Most value: ${mostValuePerson.users.name}`)
    }
  }

  // Check how many total now have feedback
  const { data: allFeedback } = await supabase
    .from('meeting_feedback')
    .select('user_id')
    .eq('meeting_id', meeting.id)

  const allHaveFeedback = attendees.every(a =>
    allFeedback?.some(f => f.user_id === a.user_id)
  )

  console.log('\n' + '='.repeat(60))
  console.log('✅ REMAINING FEEDBACK SEEDED!')
  console.log('='.repeat(60))
  console.log(`\nMeeting ID: ${meeting.id}`)
  console.log(`Total attendees: ${attendees.length}`)
  console.log(`Total feedback: ${allFeedback?.length || 0}`)
  console.log(`All have submitted: ${allHaveFeedback ? 'YES ✓' : 'NO'}`)
  console.log(`\n💡 Next step:`)
  console.log(`   Go to: http://localhost:3000/meetings/${meeting.id}/run`)
  console.log(`   The "Complete Meeting & View Summary" button should be enabled!`)
}

seedRemainingFeedback().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
