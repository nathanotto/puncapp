require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkResponses() {
  const meetingId = '49273e95-b756-48fb-a327-ff66eb75a7eb'

  console.log('🔍 Checking curriculum responses...\n')

  // Check what the meeting runner context fetches
  const { data: responses, error } = await supabase
    .from('curriculum_responses')
    .select('user_id, response')
    .eq('meeting_id', meetingId)

  if (error) {
    console.error('❌ Error fetching responses:', error)
    return
  }

  console.log(`Found ${responses?.length || 0} responses:`)
  if (responses) {
    for (const r of responses) {
      // Get user name
      const { data: user } = await supabase
        .from('users')
        .select('name')
        .eq('id', r.user_id)
        .single()

      console.log(`  - ${user?.name || r.user_id}: "${r.response.substring(0, 50)}..."`)
    }
  }

  // Check meeting current section
  const { data: meeting } = await supabase
    .from('meetings')
    .select('current_section, selected_curriculum_id')
    .eq('id', meetingId)
    .single()

  console.log(`\nMeeting status:`)
  console.log(`  Current section: ${meeting?.current_section}`)
  console.log(`  Selected curriculum: ${meeting?.selected_curriculum_id}`)
}

checkResponses()
