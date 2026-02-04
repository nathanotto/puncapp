require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function seedCurriculum() {
  console.log('🌱 Seeding curriculum data...\n')

  // Create a test sequence (let DB generate UUID)
  const { data: sequence, error: seqError } = await supabase
    .from('curriculum_sequences')
    .insert({
      title: 'Foundations of Brotherhood',
      description: 'Core principles for new members',
      order_index: 1
    })
    .select('id')
    .single()

  if (seqError) {
    console.error('❌ Error creating sequence:', seqError)
    return
  }

  console.log('✓ Created sequence: Foundations of Brotherhood')

  // Create test modules (using generated sequence ID)
  const modules = [
    {
      title: 'The Power of Presence',
      principle: 'Be in brotherhood',
      description: 'Brotherhood begins with showing up—physically, emotionally, mentally. Your presence matters more than your performance.',
      reflective_question: 'When was the last time you felt truly seen by another man? What made that moment significant?',
      exercise: 'Pair up with another man. For 2 minutes each, simply look at each other without speaking. Notice what arises.',
      sequence_id: sequence.id,
      order_in_sequence: 1
    },
    {
      title: 'Fighting Hurt',
      principle: 'Fight hurt',
      description: 'We fight hurt—in ourselves and in others. Not by avoiding pain, but by moving through it together.',
      reflective_question: 'What hurt are you currently carrying that you have not shared with another man?',
      exercise: 'Write down one hurt you are carrying. Share it with the group in one sentence.',
      sequence_id: sequence.id,
      order_in_sequence: 2
    },
    {
      title: 'Dangerous Safety',
      principle: 'Be dangerous, but not a danger',
      description: 'A man in his power is dangerous. He has the capacity to create and destroy. The key is channeling that power with wisdom.',
      reflective_question: 'In what area of your life have you been playing it too safe? What would "dangerous" look like there?',
      exercise: 'Stand up. Take up space. Let a sound come from deep in your chest. Feel your own power.',
      sequence_id: sequence.id,
      order_in_sequence: 3
    },
    {
      title: 'The Mirror of Brotherhood',
      principle: 'Other men reflect you',
      description: 'What you see in other men—both what you admire and what triggers you—reveals something about yourself.',
      reflective_question: 'Which man in this room most triggers you right now? What does that reveal about yourself?',
      exercise: 'In pairs, complete this sentence: "When I look at you, I see..."',
      sequence_id: sequence.id,
      order_in_sequence: 4
    },
    {
      title: 'Accountability Without Shame',
      principle: 'Call men up, not out',
      description: 'True accountability elevates a man toward his potential. Shame pushes him down. Learn the difference.',
      reflective_question: 'Think of a recent commitment you failed to keep. How would you want a brother to hold you accountable?',
      exercise: 'Practice giving and receiving feedback: "I see you committing to X. I also see Y happening. What support do you need?"',
      sequence_id: sequence.id,
      order_in_sequence: 5
    }
  ]

  for (const module of modules) {
    const { error: modError } = await supabase
      .from('curriculum_modules')
      .insert(module)

    if (modError) {
      console.error(`❌ Error creating module ${module.title}:`, modError)
    } else {
      console.log(`✓ Created module: ${module.title}`)
    }
  }

  console.log('\n✅ Curriculum seed data complete!')
  console.log(`\nCreated 1 sequence with ${modules.length} modules`)
}

seedCurriculum().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
