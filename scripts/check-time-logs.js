const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkTimeLogs() {
  const testMeetingId = '0beef3e4-f862-4a00-bd04-985cf49fc855'

  console.log(`🔍 Checking time logs for meeting ${testMeetingId.substring(0, 8)}...\n`)

  const { data: logs } = await supabase
    .from('meeting_time_log')
    .select('section, user_id, start_time, end_time, duration_seconds, skipped')
    .eq('meeting_id', testMeetingId)
    .order('start_time', { ascending: true })

  console.log(`Found ${logs?.length || 0} time log entries:\n`)

  logs?.forEach(log => {
    console.log(`Section: ${log.section}`)
    console.log(`  User: ${log.user_id ? log.user_id.substring(0, 8) + '...' : 'Section-level'}`)
    console.log(`  Duration: ${log.duration_seconds || 0}s`)
    console.log(`  Skipped: ${log.skipped}`)
    console.log(`  Started: ${log.start_time}`)
    console.log(`  Ended: ${log.end_time || 'Still open'}`)
    console.log()
  })

  // Check feedback
  const { data: feedback } = await supabase
    .from('meeting_feedback')
    .select('user_id, value_rating, skipped_rating')
    .eq('meeting_id', testMeetingId)

  console.log(`Feedback entries: ${feedback?.length || 0}`)
  feedback?.forEach(f => {
    console.log(`  User: ${f.user_id.substring(0, 8)}... Rating: ${f.skipped_rating ? 'Skipped' : f.value_rating}`)
  })
}

checkTimeLogs()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
