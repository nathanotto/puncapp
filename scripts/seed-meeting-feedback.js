require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const CHAPTER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

async function seedMeetingFeedback() {
  console.log('🌱 Seeding meeting feedback...\n')

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

  // Get checked-in attendees
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

  console.log(`Found ${attendees.length} checked-in attendees`)

  // Seed feedback for first 3 attendees (so we can test completing with the remaining ones)
  const feedbackToSeed = attendees.slice(0, 3)

  console.log(`\nSeeding feedback for ${feedbackToSeed.length} attendees:`)

  for (const attendee of feedbackToSeed) {
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

  const remainingCount = attendees.length - feedbackToSeed.length

  console.log('\n' + '='.repeat(60))
  console.log('✅ MEETING FEEDBACK SEEDED!')
  console.log('='.repeat(60))
  console.log(`\nMeeting ID: ${meeting.id}`)
  console.log(`Feedback submitted: ${feedbackToSeed.length} members`)
  console.log(`Still need feedback: ${remainingCount} members`)
  console.log(`\n💡 To test closing section:`)
  console.log(`   1. Advance meeting to 'closing' section (complete curriculum)`)
  console.log(`   2. Go to: http://localhost:3000/meetings/${meeting.id}/run`)
  console.log(`   3. Remaining ${remainingCount} members can submit their feedback`)
  console.log(`   4. Once all submit, Scribe can complete the meeting`)
  console.log(`\n🎤 Audio recording: Scribe can upload an audio file (optional)`)
}

seedMeetingFeedback().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
