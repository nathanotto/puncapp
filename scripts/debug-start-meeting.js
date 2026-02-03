require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const MEETING_ID = 'e5f6a7b8-c9d0-1234-ef01-567890123456'

async function debug() {
  console.log('Debugging Start Meeting page data...\n')

  // Same query as the Start Meeting page
  const { data: attendanceList, error: attendanceError } = await supabase
    .from('attendance')
    .select(`
      id,
      user_id,
      checked_in_at,
      attendance_type,
      rsvp_status,
      users!attendance_user_id_fkey (
        id,
        name,
        username
      )
    `)
    .eq('meeting_id', MEETING_ID)

  console.log('Attendance List Query:')
  if (attendanceError) {
    console.log('ERROR:', attendanceError)
  } else {
    console.log('Records found:', attendanceList?.length || 0)
    attendanceList?.forEach(a => {
      console.log(`  - User: ${a.users.name} (${a.user_id.substring(0, 8)}...)`)
      console.log(`    Checked in: ${a.checked_in_at ? 'YES at ' + a.checked_in_at : 'NO'}`)
      console.log(`    Type: ${a.attendance_type || 'N/A'}`)
    })
  }

  console.log('\nChecked in user IDs:')
  const checkedInUserIds = new Set(
    attendanceList?.filter(a => a.checked_in_at).map(a => a.user_id) || []
  )
  console.log(checkedInUserIds)

  console.log('\nChecked in count:', checkedInUserIds.size)
}

debug().catch(console.error)
