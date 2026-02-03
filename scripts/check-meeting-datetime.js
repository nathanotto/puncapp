require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

const MEETING_ID = 'e5f6a7b8-c9d0-1234-ef01-567890123456'

async function checkDateTime() {
  const { data: meeting } = await supabase
    .from('meetings')
    .select('scheduled_date, scheduled_time')
    .eq('id', MEETING_ID)
    .single()

  console.log('Database values:')
  console.log('  scheduled_date:', meeting.scheduled_date)
  console.log('  scheduled_time:', meeting.scheduled_time)
  
  console.log('\nHow JavaScript interprets it:')
  const dateObj = new Date(meeting.scheduled_date)
  console.log('  new Date(scheduled_date):', dateObj.toLocaleString())
  console.log('  toLocaleDateString:', dateObj.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long', 
    day: 'numeric',
    year: 'numeric'
  }))
  
  console.log('\nCombined date+time:')
  const combined = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`)
  console.log('  Combined:', combined.toLocaleString())
  
  console.log('\nCurrent time:')
  console.log('  Now:', new Date().toLocaleString())
}

checkDateTime()
