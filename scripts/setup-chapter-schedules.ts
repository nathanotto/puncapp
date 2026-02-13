import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables
dotenv.config({ path: path.join(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

const supabase = createClient(supabaseUrl, supabaseKey)

async function setupChapterSchedules() {
  console.log('Checking chapter schedules...\n')

  // Get all chapters (any status)
  const { data: chapters, error } = await supabase
    .from('chapters')
    .select('id, name, status, meeting_frequency, meeting_day_of_week, meeting_time, meeting_location')

  if (error) {
    console.error('Error fetching chapters:', error)
    return
  }

  if (!chapters || chapters.length === 0) {
    console.log('No active chapters found.')
    return
  }

  console.log(`Found ${chapters.length} active chapter(s):\n`)

  const needsSetup: any[] = []

  for (const chapter of chapters) {
    console.log(`Chapter: ${chapter.name}`)
    console.log(`  Status: ${chapter.status}`)
    console.log(`  Frequency: ${chapter.meeting_frequency || 'NOT SET'}`)
    console.log(`  Day of Week: ${chapter.meeting_day_of_week !== null ? chapter.meeting_day_of_week : 'NOT SET'}`)
    console.log(`  Time: ${chapter.meeting_time || 'NOT SET'}`)
    console.log(`  Location: ${chapter.meeting_location || 'NOT SET'}`)

    if (!chapter.meeting_frequency || chapter.meeting_day_of_week === null || !chapter.meeting_time) {
      needsSetup.push(chapter)
      console.log('  ⚠️  MISSING SCHEDULE FIELDS')
    } else {
      console.log('  ✅ Schedule configured')
    }
    console.log()
  }

  if (needsSetup.length > 0) {
    console.log(`\n${needsSetup.length} chapter(s) need schedule configuration.`)
    console.log('\nSetting default schedule (Weekly, Thursdays at 7:00 PM)...\n')

    for (const chapter of needsSetup) {
      const { error: updateError } = await supabase
        .from('chapters')
        .update({
          meeting_frequency: 'weekly',
          meeting_day_of_week: 4, // Thursday
          meeting_time: '19:00:00',
          meeting_location: chapter.meeting_location || 'TBD'
        })
        .eq('id', chapter.id)

      if (updateError) {
        console.error(`  ❌ Failed to update ${chapter.name}:`, updateError.message)
      } else {
        console.log(`  ✅ Updated ${chapter.name}`)
      }
    }

    console.log('\nNow re-run the scheduler to create meetings!')
  } else {
    console.log('✅ All chapters have schedules configured!')
  }
}

setupChapterSchedules()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err)
    process.exit(1)
  })
