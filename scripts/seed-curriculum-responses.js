require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const CHAPTER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

async function seedCurriculumResponses() {
  console.log('🌱 Seeding curriculum responses...\n')

  // Get the in-progress meeting
  const { data: meeting, error: meetingError } = await supabase
    .from('meetings')
    .select('id, selected_curriculum_id, chapter_id')
    .eq('chapter_id', CHAPTER_ID)
    .eq('status', 'in_progress')
    .single()

  if (meetingError || !meeting) {
    console.error('❌ No in-progress meeting found for Oak Chapter')
    return
  }

  console.log(`Found meeting: ${meeting.id}`)

  if (!meeting.selected_curriculum_id) {
    console.error('❌ No curriculum module selected for this meeting')
    console.log('💡 Run this to select a module:')
    console.log(`   UPDATE meetings SET selected_curriculum_id = (SELECT id FROM curriculum_modules LIMIT 1) WHERE id = '${meeting.id}';`)
    return
  }

  console.log(`Selected curriculum: ${meeting.selected_curriculum_id}`)

  // Get or create chapter_curriculum_history
  const { data: history, error: historyError } = await supabase
    .from('chapter_curriculum_history')
    .select('id')
    .eq('chapter_id', meeting.chapter_id)
    .eq('module_id', meeting.selected_curriculum_id)
    .eq('meeting_id', meeting.id)
    .maybeSingle()

  let historyId

  if (history) {
    historyId = history.id
    console.log(`Found existing history: ${historyId}`)
  } else {
    const { data: newHistory, error: createError } = await supabase
      .from('chapter_curriculum_history')
      .insert({
        chapter_id: meeting.chapter_id,
        module_id: meeting.selected_curriculum_id,
        meeting_id: meeting.id,
      })
      .select('id')
      .single()

    if (createError) {
      console.error('❌ Error creating history:', createError)
      return
    }

    historyId = newHistory.id
    console.log(`✓ Created history: ${historyId}`)
  }

  // Get the specific users
  const targetEmails = [
    'marcus.chen@example.com',
    'robert.kim@example.com',
    'michael.anderson@example.com',
    'carlos.rodriguez@example.com'
  ]

  const { data: users } = await supabase
    .from('users')
    .select('id, name, email')
    .in('email', targetEmails)

  if (!users || users.length === 0) {
    console.error('❌ Could not find target users')
    return
  }

  console.log(`\nFound ${users.length} users:`)
  users.forEach(u => console.log(`  - ${u.name}`))

  // Sample responses
  const responses = [
    "The last time I felt truly seen was during a difficult conversation with my brother. He didn't try to fix anything, he just listened and let me know he was there. That simple presence meant everything.",
    "I've been carrying the hurt of my father's distance for years. I never shared it because I thought it made me weak. But keeping it hidden has only made it heavier.",
    "I've been playing it too safe in my career. I stay in my comfort zone because I'm afraid of failure. Being 'dangerous' would mean taking the leap I've been avoiding for three years.",
    "When I see a man who seems to have it all together, it triggers my insecurity. That reaction reveals my fear that I'm not enough as I am."
  ]

  // Create responses for each user
  for (let i = 0; i < users.length; i++) {
    const user = users[i]
    const response = responses[i % responses.length]

    const { error: responseError } = await supabase
      .from('curriculum_responses')
      .upsert({
        chapter_curriculum_history_id: historyId,
        user_id: user.id,
        meeting_id: meeting.id,
        module_id: meeting.selected_curriculum_id,
        response: response,
      }, {
        onConflict: 'meeting_id,module_id,user_id'
      })

    if (responseError) {
      console.error(`❌ Error for ${user.name}:`, responseError)
    } else {
      console.log(`✓ Created response for ${user.name}`)
    }
  }

  console.log('\n' + '='.repeat(60))
  console.log('✅ CURRICULUM RESPONSES SEEDED!')
  console.log('='.repeat(60))
  console.log(`\nMeeting ID: ${meeting.id}`)
  console.log(`Responses: ${users.length} members`)
  console.log(`\n💡 To test curriculum section:`)
  console.log(`   1. Advance meeting to 'curriculum' section`)
  console.log(`   2. Go to: http://localhost:3000/meetings/${meeting.id}/run`)
  console.log(`   3. Remaining members can submit their responses`)
  console.log(`   4. Once all respond, Scribe can advance to Closing`)
}

seedCurriculumResponses().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
