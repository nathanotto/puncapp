import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import * as path from 'path'

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

// Sample realistic messages for men's groups
const messageTemplates = [
  "Great meeting tonight, brothers. Really needed that.",
  "Who's in for coffee before the next meeting?",
  "That conversation hit different today. Thanks for the honesty.",
  "Can someone remind me what book we're reading?",
  "Running 10 minutes late, start without me.",
  "Appreciate you all showing up consistently. It matters.",
  "Quick question about next week's location - are we still at the usual spot?",
  "That insight about fatherhood really stuck with me.",
  "Anyone want to grab lunch this week?",
  "Praying for you brother, let me know if you need anything.",
  "The curriculum module was fire tonight.",
  "Let's keep the momentum going.",
  "Who else is working on their stretch goal?",
  "Thanks for holding me accountable on that.",
  "Real talk: I struggled with what we discussed. Need to process more.",
  "Anyone up for a hike this weekend?",
  "That vulnerability took courage. Respect.",
  "Can we talk more about that topic next time?",
  "I'm in a tough spot, could use some wisdom.",
  "Grateful for this brotherhood.",
  "The ethos hit harder than usual today.",
  "Who wants to split firewood at my place Saturday?",
  "Let me know if anyone needs a ride to the meeting.",
  "That check-in was powerful. Thanks for sharing.",
  "I've been thinking about what you said all week.",
  "Can someone help me move some furniture this weekend?",
  "Looking forward to diving deeper into this next meeting.",
  "Anyone else notice the shift in energy lately?",
  "We should plan something social soon.",
  "Who's got updates on their commitment?",
  "That was exactly what I needed to hear.",
  "Solid meeting. See you all next time.",
  "Can we pray for [member]? He's going through it.",
  "Just finished that book we discussed. Mind blown.",
  "Who wants to start a side accountability group?",
  "Thanks for the tough love, needed that kick.",
  "Anyone else feeling fired up after tonight?",
  "Let's keep showing up for each other.",
  "I failed at my stretch goal this week. Reset time.",
  "That story you shared gave me perspective.",
  "We're building something special here.",
  "Don't forget to RSVP for next meeting.",
  "Who's bringing snacks next time?",
  "I see growth in this group. Keep going.",
  "Can someone pray for my job situation?",
  "That meditation really centered me tonight.",
  "Honored to be in the room with you men.",
  "Quick reminder: meeting moved to 7pm next week.",
  "Anyone have book recommendations?",
  "Let's keep the phones away during meetings.",
  "I needed that reality check tonight.",
  "Thanks for creating space for hard conversations.",
  "Who else is struggling with work-life balance?",
  "That lightning round was intense.",
  "Appreciate the no-judgment zone we've built.",
  "Can we revisit that topic from last month?",
  "I'm committing to being more consistent.",
  "Anyone want to do a workout together?",
  "That feedback stung but it was right.",
  "We should do a group camping trip.",
  "Who's down for basketball next Saturday?",
  "Thanks for not letting me off easy.",
  "I see you putting in the work, brother.",
  "Let's keep the meetings starting on time.",
  "Anyone else working on marriage stuff?",
  "That curriculum connected some dots for me.",
  "I'm grateful this group exists.",
  "Who needs help with anything this week?",
  "Can someone explain the stretch goal concept again?",
  "Real progress happening here, men.",
  "Don't let me skip next meeting, hold me to it.",
  "Anyone else feel like they're finally getting it?",
  "Thanks for the encouragement when I was down.",
  "Who wants to grab breakfast before work?",
  "That was uncomfortable but necessary.",
  "I'm all in on this brotherhood thing.",
  "Can we add 15 minutes to discuss that more?",
  "Who else is tired of their own excuses?",
  "Thanks for showing up even when it's hard.",
  "Anyone have advice on conflict resolution?",
  "That story hit close to home for me.",
  "We're all growing together. Keep going.",
  "Who's got a win to share from this week?",
  "I need to step up my game, you guys inspire me.",
  "Can someone mentor me on leadership?",
  "That honesty took guts. Respect.",
  "Anyone else notice we're becoming better men?",
  "Let's plan a service project together.",
  "Who needs prayer this week?",
  "Thanks for calling out my blind spots.",
  "I'm seeing the long-term value of consistency.",
  "Anyone want to discuss that book over coffee?",
  "That feedback loop is working, keep it up.",
  "Who's in for the early morning meeting option?",
  "I challenged myself because of you guys.",
  "Can we do more curriculum on relationships?",
  "Thanks for being real, not perfect.",
  "Who else is finding this life-changing?",
  "Let's keep building this culture of accountability.",
  "Anyone need help with home projects?",
  "That meeting was exactly what I needed today.",
  "I'm bringing my brother next time, he needs this.",
  "Who wants to do a book study together?",
]

async function seedChapterMessages() {
  console.log('Starting chapter messages seed...')

  // Get Oak North and Pine Chapter IDs
  const { data: chapters } = await supabase
    .from('chapters')
    .select('id, name')
    .in('name', ['Oak North', 'Pine Chapter'])

  if (!chapters || chapters.length === 0) {
    console.error('Could not find Oak North or Pine Chapter')
    return
  }

  console.log('Found chapters:', chapters.map(c => c.name).join(', '))

  for (const chapter of chapters) {
    console.log(`\nSeeding messages for ${chapter.name}...`)

    // Get active members for this chapter
    const { data: members } = await supabase
      .from('chapter_memberships')
      .select('user_id')
      .eq('chapter_id', chapter.id)
      .eq('is_active', true)

    if (!members || members.length === 0) {
      console.log(`No active members found for ${chapter.name}, skipping...`)
      continue
    }

    console.log(`Found ${members.length} active members`)

    // Generate 100 messages with realistic timestamps
    const messages = []
    const now = new Date()

    // Spread messages over the last 60 days
    for (let i = 0; i < 100; i++) {
      // Random member
      const randomMember = members[Math.floor(Math.random() * members.length)]

      // Random message
      const randomMessage = messageTemplates[Math.floor(Math.random() * messageTemplates.length)]

      // Random timestamp in the last 60 days
      // More recent messages are more common (weighted toward recent)
      const daysAgo = Math.floor(Math.pow(Math.random(), 2) * 60) // Weighted toward 0 (recent)
      const hoursAgo = Math.floor(Math.random() * 24)
      const minutesAgo = Math.floor(Math.random() * 60)

      const timestamp = new Date(now)
      timestamp.setDate(timestamp.getDate() - daysAgo)
      timestamp.setHours(timestamp.getHours() - hoursAgo)
      timestamp.setMinutes(timestamp.getMinutes() - minutesAgo)

      messages.push({
        chapter_id: chapter.id,
        user_id: randomMember.user_id,
        message_text: randomMessage,
        created_at: timestamp.toISOString(),
        updated_at: timestamp.toISOString(),
        edited: Math.random() < 0.1 // 10% chance of being edited
      })
    }

    // Sort by timestamp (oldest first for insertion)
    messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())

    // Insert messages in batches of 20
    for (let i = 0; i < messages.length; i += 20) {
      const batch = messages.slice(i, i + 20)
      const { error } = await supabase
        .from('chapter_messages')
        .insert(batch)

      if (error) {
        console.error(`Error inserting batch for ${chapter.name}:`, error)
      } else {
        console.log(`Inserted messages ${i + 1}-${Math.min(i + 20, messages.length)} for ${chapter.name}`)
      }
    }

    console.log(`✓ Completed ${chapter.name}: 100 messages inserted`)
  }

  console.log('\n✓ Seed complete!')
}

seedChapterMessages().catch(console.error)
