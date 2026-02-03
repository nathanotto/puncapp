require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function fixTimezone() {
  console.log('Fixing task due times to match meeting times...\n')

  // Get today's meeting
  const today = new Date().toISOString().split('T')[0]
  const { data: meeting } = await supabase
    .from('meetings')
    .select('id, scheduled_date, scheduled_time')
    .eq('scheduled_date', today)
    .single()

  if (!meeting) {
    console.log('No meeting found for today')
    return
  }

  console.log('Meeting:', meeting.scheduled_date, meeting.scheduled_time)

  // Get check-in tasks for this meeting
  const { data: tasks } = await supabase
    .from('pending_tasks')
    .select('id, due_at')
    .eq('task_type', 'check_in_to_meeting')
    .eq('related_entity_id', meeting.id)

  if (!tasks || tasks.length === 0) {
    console.log('No tasks found')
    return
  }

  console.log(`Found ${tasks.length} tasks\n`)

  // Create proper timestamp with timezone (Mountain Time is UTC-7)
  // Format: 2026-02-02T12:30:00-07:00
  const dueAtWithTz = `${meeting.scheduled_date}T${meeting.scheduled_time}-07:00`

  console.log('Updating due_at to:', dueAtWithTz)

  const { error } = await supabase
    .from('pending_tasks')
    .update({ due_at: dueAtWithTz })
    .in('id', tasks.map(t => t.id))

  if (error) {
    console.error('Error:', error)
  } else {
    console.log(`\n✅ Updated ${tasks.length} tasks`)

    // Verify
    const now = new Date()
    const dueDate = new Date(dueAtWithTz)
    const diffMinutes = Math.round((now.getTime() - dueDate.getTime()) / (60 * 1000))

    console.log('\nVerification:')
    console.log('  Due:', dueDate.toLocaleString())
    console.log('  Now:', now.toLocaleString())
    console.log('  Difference:', diffMinutes, 'minutes')
  }
}

fixTimezone()
