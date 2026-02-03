require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const CHAPTER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

async function checkinAllMembers() {
  console.log('📋 Checking in all Oak Chapter members...\n')

  // Get today's meeting
  const today = new Date().toISOString().split('T')[0]
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('id, scheduled_date, scheduled_time')
    .eq('chapter_id', CHAPTER_ID)
    .eq('scheduled_date', today)
    .single()

  if (meetingError || !meeting) {
    console.error('❌ Could not find today\'s meeting:', meetingError?.message)
    return
  }

  console.log(`Meeting: ${meeting.scheduled_date} at ${meeting.scheduled_time}`)
  console.log(`Meeting ID: ${meeting.id}\n`)

  // Get all chapter members
  const { data: members, error: membersError } = await supabase
    .from('chapter_memberships')
    .select('user_id, users!inner(id, name, username)')
    .eq('chapter_id', CHAPTER_ID)
    .eq('is_active', true)

  if (membersError || !members) {
    console.error('❌ Could not fetch members:', membersError?.message)
    return
  }

  console.log(`Found ${members.length} members\n`)

  const now = new Date().toISOString()

  // Check in all members
  for (const member of members) {
    const user = member.users

    // Check if attendance record exists
    const { data: existing } = await supabase
      .from('attendance')
      .select('id, checked_in_at')
      .eq('meeting_id', meeting.id)
      .eq('user_id', user.id)
      .single()

    if (existing?.checked_in_at) {
      console.log(`✓ ${user.name} - already checked in`)
    } else if (existing) {
      // Update existing attendance
      const { error: updateError } = await supabase
        .from('attendance')
        .update({
          checked_in_at: now,
          attendance_type: 'in_person'
        })
        .eq('id', existing.id)

      if (updateError) {
        console.log(`❌ ${user.name} - failed to update: ${updateError.message}`)
      } else {
        console.log(`✓ ${user.name} - checked in`)
      }
    } else {
      // Create new attendance record
      const { error: insertError } = await supabase
        .from('attendance')
        .insert({
          meeting_id: meeting.id,
          user_id: user.id,
          rsvp_status: 'yes',
          checked_in_at: now,
          attendance_type: 'in_person'
        })

      if (insertError) {
        console.log(`❌ ${user.name} - failed to create: ${insertError.message}`)
      } else {
        console.log(`✓ ${user.name} - checked in`)
      }
    }
  }

  console.log('\n✅ All members checked in!')
}

checkinAllMembers().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
