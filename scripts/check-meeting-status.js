const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const supabase = createClient(supabaseUrl, supabaseKey)

async function checkMeetingStatus() {
  console.log('Checking meeting status...\n')

  const { data: meetings, error } = await supabase
    .from('meetings')
    .select('id, scheduled_date, scheduled_time, status, actual_start_time, completed_at, current_section')
    .in('status', ['scheduled', 'in_progress', 'completed'])
    .order('scheduled_date', { ascending: false })
    .limit(5)

  if (error) {
    console.error('Error fetching meetings:', error)
    return
  }

  console.log('Recent meetings:')
  console.log('─'.repeat(100))
  meetings.forEach(m => {
    console.log(`ID: ${m.id.substring(0, 8)}...`)
    console.log(`  Date: ${m.scheduled_date} ${m.scheduled_time}`)
    console.log(`  Status: ${m.status}`)
    console.log(`  Started: ${m.actual_start_time ? 'Yes (' + new Date(m.actual_start_time).toLocaleString() + ')' : 'No'}`)
    console.log(`  Completed: ${m.completed_at ? 'Yes (' + new Date(m.completed_at).toLocaleString() + ')' : 'No'}`)
    console.log(`  Current Section: ${m.current_section}`)
    console.log('─'.repeat(100))
  })
}

checkMeetingStatus().then(() => process.exit(0)).catch(err => {
  console.error(err)
  process.exit(1)
})
