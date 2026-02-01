#!/usr/bin/env node
/**
 * Large seed data for PUNC - 20 chapters, 200 users, 100 commitments
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Generate realistic names
const firstNames = ['John', 'Mike', 'David', 'Robert', 'James', 'William', 'Thomas', 'Daniel', 'Mark', 'Paul',
  'Steven', 'Andrew', 'Brian', 'Kevin', 'George', 'Edward', 'Ryan', 'Jason', 'Matthew', 'Joshua',
  'Christopher', 'Anthony', 'Donald', 'Kenneth', 'Timothy', 'Ronald', 'Jonathan', 'Gary', 'Nicholas', 'Eric',
  'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon', 'Benjamin', 'Samuel', 'Raymond', 'Gregory', 'Alexander',
  'Patrick', 'Frank', 'Dennis', 'Jerry', 'Tyler', 'Aaron', 'Henry', 'Douglas', 'Peter', 'Walter']

const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin',
  'Lee', 'Perez', 'Thompson', 'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill', 'Flores',
  'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell', 'Mitchell', 'Carter', 'Roberts']

const cities = [
  { name: 'Denver', state: 'CO', zip: '80202' },
  { name: 'Boulder', state: 'CO', zip: '80301' },
  { name: 'Colorado Springs', state: 'CO', zip: '80903' },
  { name: 'Fort Collins', state: 'CO', zip: '80521' },
  { name: 'Aurora', state: 'CO', zip: '80012' },
  { name: 'Lakewood', state: 'CO', zip: '80226' },
  { name: 'Thornton', state: 'CO', zip: '80229' },
  { name: 'Arvada', state: 'CO', zip: '80002' },
  { name: 'Westminster', state: 'CO', zip: '80030' },
  { name: 'Pueblo', state: 'CO', zip: '81003' },
]

const chapterNames = [
  'The Oak Chapter', 'The Six Chapter', 'Iron Brotherhood', 'The Summit Circle', 'The Forge',
  'Evergreen Council', 'The Wilderness Lodge', 'Mountain Men', 'The Stone Circle', 'Fire & Iron',
  'The Brotherhood', 'Alpine Warriors', 'The Foundation', 'Peak Performance', 'The Gathering',
  'Men of Purpose', 'The Round Table', 'Granite Brotherhood', 'The Alliance', 'True North Men'
]

async function clearExistingData() {
  console.log('Clearing existing data...')

  await supabase.from('chapter_funding').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('chapter_updates').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('meeting_feedback').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('commitments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('meetings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('chapter_roles').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('chapter_memberships').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('chapters').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('users').delete().like('email', '%@seed.test')

  console.log('✅ Cleared existing data\n')
}

async function createUsers(count) {
  console.log(`Creating ${count} users...`)
  const users = []

  for (let i = 0; i < count; i++) {
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)]
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)]
    const username = `${firstName.toLowerCase()}${lastName.toLowerCase()}${i}`
    const email = `${username}@seed.test`

    try {
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: 'password123',
        email_confirm: true
      })

      if (authError) {
        console.error(`  ❌ ${email}:`, authError.message)
        continue
      }

      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          name: `${firstName} ${lastName}`,
          phone: '555' + String(Math.floor(Math.random() * 10000000)).padStart(7, '0'),
          email: email,
          address: `${cities[i % cities.length].name}, ${cities[i % cities.length].state}`,
          username: username,
          display_preference: Math.random() > 0.5 ? 'real_name' : 'username',
          status: 'assigned',
          leader_certified: i % 10 === 0, // Every 10th user is leader certified
          is_admin: false
        })

      if (profileError) {
        console.error(`  ❌ Profile for ${email}:`, profileError.message)
        continue
      }

      users.push({ ...authData.user, name: `${firstName} ${lastName}`, username })
      if ((i + 1) % 20 === 0) console.log(`  Created ${i + 1}/${count} users...`)
    } catch (err) {
      console.error(`  ❌ ${email}:`, err.message)
    }
  }

  console.log(`\n✅ Created ${users.length} users\n`)
  return users
}

async function createChapters(users) {
  console.log('Creating 20 chapters...')
  const chapters = []
  const usersPerChapter = Math.floor(users.length / 20)

  for (let i = 0; i < 20; i++) {
    const city = cities[i % cities.length]

    // Spread creation dates over the past 12 months
    // Earlier chapters created longer ago
    const monthsAgo = Math.floor((19 - i) / 2) // Spread from 0-9 months ago
    const createdDate = new Date()
    createdDate.setMonth(createdDate.getMonth() - monthsAgo)
    createdDate.setDate(Math.floor(Math.random() * 28) + 1) // Random day of month

    // Decide if chapter should be closed (but not The Oak or The Six)
    const shouldClose = i > 1 && i < 20 && Math.random() < 0.15 // ~15% closed rate, skip first 2
    const status = shouldClose ? 'closed' : (i < 18 ? 'open' : 'forming')

    // If closed, set a closed date (updated_at) sometime after creation
    const updatedDate = shouldClose
      ? new Date(createdDate.getTime() + Math.random() * (Date.now() - createdDate.getTime()))
      : new Date()

    const { data: chapterData, error: chapterError } = await supabase
      .from('chapters')
      .insert({
        name: chapterNames[i],
        status: status,
        max_members: 12,
        monthly_support: 55.00,
        created_at: createdDate.toISOString(),
        updated_at: updatedDate.toISOString(),
        meeting_schedule: {
          frequency: 'biweekly',
          day_of_week: i % 7,
          time: '19:00',
          location: {
            street: `${1000 + i * 100} Main Street`,
            city: city.name,
            state: city.state,
            zip: city.zip
          }
        },
        next_meeting_location: {
          street: `${1000 + i * 100} Main Street`,
          city: city.name,
          state: city.state,
          zip: city.zip
        }
      })
      .select()
      .single()

    if (chapterError) {
      console.error(`  ❌ ${chapterNames[i]}:`, chapterError.message)
      continue
    }

    // Assign users to chapter
    const startIdx = i * usersPerChapter
    const chapterUsers = users.slice(startIdx, startIdx + usersPerChapter)

    for (const user of chapterUsers) {
      await supabase
        .from('chapter_memberships')
        .insert({
          chapter_id: chapterData.id,
          user_id: user.id,
          joined_at: new Date(Date.now() - Math.random() * 365 * 24 * 60 * 60 * 1000).toISOString(),
          is_active: true
        })
    }

    // Make first user leader
    if (chapterUsers.length > 0) {
      await supabase
        .from('chapter_roles')
        .insert({
          chapter_id: chapterData.id,
          user_id: chapterUsers[0].id,
          role_type: 'Chapter Leader'
        })

      await supabase
        .from('users')
        .update({ leader_certified: true, leader_certification_date: new Date().toISOString() })
        .eq('id', chapterUsers[0].id)
    }

    chapters.push({ ...chapterData, members: chapterUsers })
    const statusLabel = chapterData.status === 'closed' ? '❌ closed' : chapterData.status === 'forming' ? '🔄 forming' : '✅ open'
    console.log(`  ${statusLabel} ${chapterNames[i]} (${chapterUsers.length} members, created ${Math.floor((Date.now() - new Date(chapterData.created_at).getTime()) / (1000 * 60 * 60 * 24 * 30))} months ago)`)
  }

  console.log(`\n✅ Created ${chapters.length} chapters\n`)
  return chapters
}

async function createCommitments(chapters) {
  console.log('Creating 100 commitments...')
  const types = ['stretch_goal', 'to_member', 'volunteer_activity', 'help_favor']
  const descriptions = [
    'Call my father every Sunday',
    'Attend therapy for 4 consecutive weeks',
    'Have a difficult conversation with my partner',
    'Volunteer at local food bank for 4 hours',
    'Mentor a young man in the community',
    'Help organize community cleanup day',
    'Looking for recommendations for a therapist',
    'Need help moving this weekend',
    'Seeking advice on career transition',
    'Complete the 30-day fitness challenge',
    'Read one book per month for 3 months',
    'Practice daily meditation for 21 days',
    'Reach out to an old friend I lost touch with',
    'Take my family on a weekend camping trip',
    'Learn to cook 3 new healthy meals'
  ]

  let created = 0

  for (const chapter of chapters) {
    if (!chapter.members || chapter.members.length === 0) continue

    const count = Math.floor(100 / chapters.length) + (Math.random() > 0.5 ? 1 : 0)

    for (let i = 0; i < count && created < 100; i++) {
      const member = chapter.members[Math.floor(Math.random() * chapter.members.length)]
      const type = types[Math.floor(Math.random() * types.length)]
      const description = descriptions[Math.floor(Math.random() * descriptions.length)]
      const recipient = type === 'to_member' && chapter.members.length > 1
        ? chapter.members.find(m => m.id !== member.id)
        : null

      const daysAgo = Math.floor(Math.random() * 90)
      const deadline = new Date(Date.now() + (14 - daysAgo) * 24 * 60 * 60 * 1000)
      const isPast = deadline < new Date()

      await supabase
        .from('commitments')
        .insert({
          chapter_id: chapter.id,
          made_by: member.id,
          commitment_type: type,
          description: description,
          recipient_id: recipient?.id || null,
          deadline: deadline.toISOString(),
          status: isPast ? (Math.random() > 0.3 ? 'completed' : 'abandoned') : 'pending',
          self_reported_status: isPast ? (Math.random() > 0.3 ? 'completed' : 'abandoned') : 'pending',
          created_at: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000).toISOString()
        })

      created++
    }
  }

  console.log(`✅ Created ${created} commitments\n`)
}

async function createFunding(chapters) {
  console.log('Creating chapter funding data...')
  let totalFunding = 0

  for (const chapter of chapters) {
    if (!chapter.members || chapter.members.length === 0) continue

    // Randomly decide if chapter is funded
    const isFunded = Math.random() > 0.5 // ~50% funded

    if (isFunded) {
      const monthlyGoal = chapter.monthly_support || 55
      const funders = Math.floor(Math.random() * chapter.members.length) + 1
      const amountPerFunder = monthlyGoal / funders

      for (let i = 0; i < funders && i < chapter.members.length; i++) {
        const amount = Math.round((amountPerFunder + (Math.random() * 20 - 10)) * 100) / 100

        // Create funding for past 3 months
        for (let month = 0; month < 3; month++) {
          const fundingDate = new Date()
          fundingDate.setMonth(fundingDate.getMonth() - month)

          await supabase
            .from('chapter_funding')
            .insert({
              user_id: chapter.members[i].id,
              chapter_id: chapter.id,
              amount: amount,
              funding_date: fundingDate.toISOString().split('T')[0]
            })

          totalFunding += amount
        }
      }
    }
  }

  console.log(`✅ Created funding records (total: $${Math.round(totalFunding)})\n`)
}

async function createMeetings(chapters) {
  console.log('Creating meetings...')
  let totalMeetings = 0

  const curriculumModules = [
    'a1111111-1111-1111-1111-111111111111', // Fear of Men
    'a2222222-2222-2222-2222-222222222222', // Addiction
    'a3333333-3333-3333-3333-333333333333', // Relationships
    'a4444444-4444-4444-4444-444444444444', // Anger
    'a5555555-5555-5555-5555-555555555555', // Purpose
    'a6666666-6666-6666-6666-666666666666', // Grief
    'a7777777-7777-7777-7777-777777777777', // Shame
    'a8888888-8888-8888-8888-888888888888', // Leadership
  ]

  const topics = [
    'Fear of Men', 'Addiction and Compulsive Behavior', 'Relationships and Intimacy',
    'Anger and Rage', 'Purpose and Calling', 'Grief and Loss',
    'Shame and Vulnerability', 'Leadership and Responsibility'
  ]

  for (const chapter of chapters) {
    if (!chapter.members || chapter.members.length === 0) continue

    const createdDate = new Date(chapter.created_at)
    const endDate = chapter.status === 'closed'
      ? new Date(chapter.updated_at)
      : new Date() // For open chapters, go up to now

    // Add 4 weeks of future meetings for open chapters
    const finalDate = chapter.status === 'closed' ? endDate : new Date(Date.now() + (4 * 7 * 24 * 60 * 60 * 1000))

    let meetingDate = new Date(createdDate)
    let meetingCount = 0

    while (meetingDate <= finalDate) {
      const isPast = meetingDate < new Date()
      const moduleIdx = meetingCount % 8

      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert({
          chapter_id: chapter.id,
          scheduled_datetime: meetingDate.toISOString(),
          location: chapter.next_meeting_location,
          topic: topics[moduleIdx],
          curriculum_module_id: curriculumModules[moduleIdx],
          status: isPast ? 'completed' : 'scheduled'
        })
        .select()
        .single()

      if (!error && isPast && meeting) {
        // Add attendance for completed meetings
        for (const member of chapter.members) {
          const attended = Math.random() > 0.2 // 80% attendance rate
          await supabase
            .from('attendance')
            .insert({
              meeting_id: meeting.id,
              user_id: member.id,
              rsvp_status: attended ? 'yes' : 'no',
              attendance_type: attended ? (Math.random() > 0.1 ? 'in_person' : 'video') : 'absent',
              checked_in_at: attended ? meetingDate.toISOString() : null
            })

          // Add feedback
          if (attended) {
            await supabase
              .from('meeting_feedback')
              .insert({
                meeting_id: meeting.id,
                user_id: member.id,
                value_rating: Math.floor(7 + Math.random() * 4) // 7-10
              })
          }
        }
      }

      totalMeetings++
      meetingCount++

      // Add 3 weeks
      meetingDate = new Date(meetingDate.getTime() + (21 * 24 * 60 * 60 * 1000))
    }
  }

  console.log(`✅ Created ${totalMeetings} meetings\n`)
}

async function main() {
  console.log('🌱 Starting large seed...\n')

  try {
    await clearExistingData()
    const users = await createUsers(200)
    const chapters = await createChapters(users)
    await createMeetings(chapters)
    await createCommitments(chapters)
    await createFunding(chapters)

    console.log('🎉 Seed complete!\n')
    console.log('Summary:')
    console.log(`  - ${users.length} users`)
    console.log(`  - ${chapters.length} chapters`)
    console.log(`  - Meetings with attendance & feedback`)
    console.log(`  - 100 commitments`)
    console.log(`  - Chapter funding (~50% funded)`)
  } catch (err) {
    console.error('Error during seed:', err)
    process.exit(1)
  }
}

main()
