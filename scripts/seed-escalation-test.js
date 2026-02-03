require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const YOUR_USER_ID = '78d0b1d5-08a6-4923-8bef-49d804cafa73'
const CHAPTER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

async function seedEscalationTest() {
  console.log('🧪 Seeding escalation test data...\n')

  const now = new Date()
  const threeDaysFromNow = new Date(now)
  threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)
  const twoDaysFromNow = new Date(now)
  twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)
  const oneDayFromNow = new Date(now)
  oneDayFromNow.setDate(oneDayFromNow.getDate() + 1)

  // ============================================
  // Meeting 1: 3 days from now (reminder test)
  // ============================================

  console.log('Creating meeting 3 days from now (for reminder test)...')

  const meeting3DaysId = 'c3d4e5f6-a7b8-9012-cdef-345678901234'

  const { error: meeting3Error } = await supabase
    .from('meetings')
    .insert({
      id: meeting3DaysId,
      chapter_id: CHAPTER_ID,
      scheduled_date: threeDaysFromNow.toISOString().split('T')[0],
      scheduled_time: '09:00',
      location: '123 Main St, Austin, TX',
      status: 'scheduled',
      rsvp_deadline: oneDayFromNow.toISOString(),
    })

  if (meeting3Error && !meeting3Error.message.includes('duplicate')) {
    console.log('  ⚠️  Meeting 3 days creation failed:', meeting3Error.message)
  } else {
    console.log('  ✅ Meeting created')
  }

  // Create attendance with no response
  const { error: attendance3Error } = await supabase
    .from('attendance')
    .insert({
      meeting_id: meeting3DaysId,
      user_id: YOUR_USER_ID,
      rsvp_status: 'no_response',
    })

  if (attendance3Error && !attendance3Error.message.includes('duplicate')) {
    console.log('  ⚠️  Attendance creation failed:', attendance3Error.message)
  } else {
    console.log('  ✅ Attendance created (no response)')
  }

  // Create pending RSVP task
  const { error: task3Error } = await supabase
    .from('pending_tasks')
    .insert({
      task_type: 'respond_to_rsvp',
      assigned_to: YOUR_USER_ID,
      related_entity_type: 'meeting',
      related_entity_id: meeting3DaysId,
      metadata: { chapter_name: 'The Oak Chapter' },
      due_at: oneDayFromNow.toISOString(),
      urgency: 'normal',
    })

  if (task3Error && !task3Error.message.includes('duplicate')) {
    console.log('  ⚠️  Task creation failed:', task3Error.message)
  } else {
    console.log('  ✅ Pending RSVP task created (urgency: normal)')
  }

  console.log('')

  // ============================================
  // Meeting 2: 2 days from now (leader task test)
  // ============================================

  console.log('Creating meeting 2 days from now (for leader contact task test)...')

  const meeting2DaysId = 'd4e5f6a7-b8c9-0123-def0-456789012345'

  const { error: meeting2Error } = await supabase
    .from('meetings')
    .insert({
      id: meeting2DaysId,
      chapter_id: CHAPTER_ID,
      scheduled_date: twoDaysFromNow.toISOString().split('T')[0],
      scheduled_time: '09:00',
      location: '123 Main St, Austin, TX',
      status: 'scheduled',
      rsvp_deadline: now.toISOString(), // Deadline already passed
    })

  if (meeting2Error && !meeting2Error.message.includes('duplicate')) {
    console.log('  ⚠️  Meeting 2 days creation failed:', meeting2Error.message)
  } else {
    console.log('  ✅ Meeting created')
  }

  // Create attendance with no response AND already reminded
  const { error: attendance2Error } = await supabase
    .from('attendance')
    .insert({
      meeting_id: meeting2DaysId,
      user_id: YOUR_USER_ID,
      rsvp_status: 'no_response',
      reminder_sent_at: new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString(), // Reminder sent yesterday
    })

  if (attendance2Error && !attendance2Error.message.includes('duplicate')) {
    console.log('  ⚠️  Attendance creation failed:', attendance2Error.message)
  } else {
    console.log('  ✅ Attendance created (no response, reminder already sent)')
  }

  // Create pending task already at 'reminded' urgency
  const { error: task2Error } = await supabase
    .from('pending_tasks')
    .insert({
      task_type: 'respond_to_rsvp',
      assigned_to: YOUR_USER_ID,
      related_entity_type: 'meeting',
      related_entity_id: meeting2DaysId,
      metadata: { chapter_name: 'The Oak Chapter' },
      due_at: now.toISOString(),
      urgency: 'reminded',
    })

  if (task2Error && !task2Error.message.includes('duplicate')) {
    console.log('  ⚠️  Task creation failed:', task2Error.message)
  } else {
    console.log('  ✅ Pending RSVP task created (urgency: reminded)')
  }

  console.log('')

  // ============================================
  // Make yourself a leader
  // ============================================

  console.log('Making you a leader of The Oak Chapter...')

  const { error: leaderError } = await supabase
    .from('chapter_memberships')
    .update({ role: 'leader' })
    .eq('user_id', YOUR_USER_ID)
    .eq('chapter_id', CHAPTER_ID)

  if (leaderError) {
    console.log('  ⚠️  Leader role update failed:', leaderError.message)
  } else {
    console.log('  ✅ You are now a leader')
  }

  console.log('')
  console.log('✅ Escalation test data seeded!')
  console.log('')
  console.log('📋 Summary:')
  console.log(`  • Meeting 3 days from now: ${threeDaysFromNow.toISOString().split('T')[0]}`)
  console.log(`    → Escalation will send reminders and update urgency to "reminded"`)
  console.log(`  • Meeting 2 days from now: ${twoDaysFromNow.toISOString().split('T')[0]}`)
  console.log(`    → Escalation will create leader contact task and update urgency to "escalated"`)
  console.log(`  • You are now a leader, so you'll receive the contact task`)
  console.log('')
  console.log('🧪 To test: Go to /admin/notifications and click "Trigger Escalation"')
}

seedEscalationTest().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
