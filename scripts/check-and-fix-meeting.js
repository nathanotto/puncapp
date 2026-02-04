const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables!')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkAndFixMeeting() {
  console.log('Checking Oak Chapter meeting status...\n')

  // Find the meeting
  const { data: meetings, error } = await supabase
    .from('meetings')
    .select('id, scheduled_date, scheduled_time, status, actual_start_time, completed_at, current_section, chapter_id')
    .not('actual_start_time', 'is', null)
    .order('actual_start_time', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error:', error)
    return
  }

  console.log('Recent meetings:')
  meetings.forEach(m => {
    console.log(`\nID: ${m.id}`)
    console.log(`  Date: ${m.scheduled_date} ${m.scheduled_time}`)
    console.log(`  Status: ${m.status}`)
    console.log(`  Started: ${m.actual_start_time || 'No'}`)
    console.log(`  Completed: ${m.completed_at || 'No'}`)
    console.log(`  Current Section: ${m.current_section}`)
  })

  // Find the in-progress meeting that should be completed
  // (closing section means user tried to complete but it failed)
  const inProgressMeeting = meetings.find(m =>
    m.status === 'in_progress' &&
    m.actual_start_time &&
    !m.completed_at
  )

  if (inProgressMeeting) {
    console.log(`\n\n⚠️  Found meeting that should be completed: ${inProgressMeeting.id}`)
    console.log(`   Status: ${inProgressMeeting.status}, Section: ${inProgressMeeting.current_section}`)
    console.log('   This meeting needs to be marked as completed.')

    // Fix it
    console.log('\n🔧 Fixing meeting status...')
    const now = new Date().toISOString()

    // End the closing section time log
    await supabase
      .from('meeting_time_log')
      .update({ end_time: now })
      .eq('meeting_id', inProgressMeeting.id)
      .eq('section', 'closing')
      .is('end_time', null)
      .is('user_id', null)

    // Update meeting status
    const { error: updateError } = await supabase
      .from('meetings')
      .update({
        status: 'completed',
        current_section: 'ended',
        completed_at: now
      })
      .eq('id', inProgressMeeting.id)

    if (updateError) {
      console.error('Error updating:', updateError)
    } else {
      console.log('✓ Meeting marked as completed!')
      console.log('✓ Time log closed')
    }
  } else {
    console.log('\n✓ No meetings need fixing')
  }
}

checkAndFixMeeting()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
