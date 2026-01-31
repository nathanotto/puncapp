#!/usr/bin/env node
/**
 * Comprehensive seed data for PUNC
 * Creates 7 chapters with multiple members, meetings, and commitments
 */

import { createClient } from '@supabase/supabase-js'

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

// Test users to create
const testUsers = [
  { email: 'john.smith@test.com', name: 'John Smith', username: 'johnsmith' },
  { email: 'mike.johnson@test.com', name: 'Mike Johnson', username: 'mikej' },
  { email: 'david.wilson@test.com', name: 'David Wilson', username: 'davidw' },
  { email: 'robert.brown@test.com', name: 'Robert Brown', username: 'robbie' },
  { email: 'james.davis@test.com', name: 'James Davis', username: 'jamesd' },
  { email: 'william.miller@test.com', name: 'William Miller', username: 'willm' },
  { email: 'thomas.moore@test.com', name: 'Thomas Moore', username: 'tom' },
  { email: 'daniel.taylor@test.com', name: 'Daniel Taylor', username: 'dantaylor' },
  { email: 'mark.anderson@test.com', name: 'Mark Anderson', username: 'marka' },
  { email: 'paul.thomas@test.com', name: 'Paul Thomas', username: 'pault' },
  { email: 'steven.jackson@test.com', name: 'Steven Jackson', username: 'stevej' },
  { email: 'andrew.white@test.com', name: 'Andrew White', username: 'andreww' },
  { email: 'brian.harris@test.com', name: 'Brian Harris', username: 'brianh' },
  { email: 'kevin.martin@test.com', name: 'Kevin Martin', username: 'kevinm' },
  { email: 'george.thompson@test.com', name: 'George Thompson', username: 'georget' },
]

// Chapters to create
const chapters = [
  { name: 'The Oak Chapter', location: '1234 Oak Street', city: 'Denver', state: 'CO', zip: '80202' },
  { name: 'The Six Chapter', location: '3345 Chestnut Drive', city: 'Denver', state: 'CO', zip: '80213' },
  { name: 'Iron Brotherhood', location: '789 Steel Avenue', city: 'Boulder', state: 'CO', zip: '80301' },
  { name: 'The Summit Circle', location: '456 Mountain Road', city: 'Colorado Springs', state: 'CO', zip: '80903' },
  { name: 'The Forge', location: '234 Anvil Street', city: 'Fort Collins', state: 'CO', zip: '80521' },
  { name: 'Evergreen Council', location: '567 Pine Trail', city: 'Denver', state: 'CO', zip: '80220' },
  { name: 'The Wilderness Lodge', location: '890 Canyon Drive', city: 'Aurora', state: 'CO', zip: '80012' },
]

// Curriculum modules (same as before)
const curriculumModules = [
  { id: 'a1111111-1111-1111-1111-111111111111', title: 'Fear of Men', category: 'fear', order: 1 },
  { id: 'a2222222-2222-2222-2222-222222222222', title: 'Addiction and Compulsive Behavior', category: 'addiction', order: 2 },
  { id: 'a3333333-3333-3333-3333-333333333333', title: 'Relationships and Intimacy', category: 'relationship', order: 3 },
  { id: 'a4444444-4444-4444-4444-444444444444', title: 'Anger and Rage', category: 'emotion', order: 4 },
  { id: 'a5555555-5555-5555-5555-555555555555', title: 'Purpose and Calling', category: 'purpose', order: 5 },
  { id: 'a6666666-6666-6666-6666-666666666666', title: 'Grief and Loss', category: 'emotion', order: 6 },
  { id: 'a7777777-7777-7777-7777-777777777777', title: 'Shame and Vulnerability', category: 'emotion', order: 7 },
  { id: 'a8888888-8888-8888-8888-888888888888', title: 'Leadership and Responsibility', category: 'leadership', order: 8 },
]

async function clearExistingData() {
  console.log('Clearing existing test data...')

  // Delete in reverse order of dependencies
  await supabase.from('meeting_feedback').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('commitments').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('meetings').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('chapter_roles').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('chapter_memberships').delete().neq('id', '00000000-0000-0000-0000-000000000000')
  await supabase.from('chapters').delete().neq('id', '00000000-0000-0000-0000-000000000000')

  // Delete test users (keep Nathan and Angie)
  await supabase.from('users').delete().like('email', '%@test.com')

  console.log('✅ Existing data cleared\n')
}

async function createUsers() {
  console.log('Creating test users...')
  const createdUsers = []

  for (const user of testUsers) {
    try {
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: user.email,
        password: 'password123',
        email_confirm: true
      })

      if (authError) {
        console.error(`  ❌ Failed to create auth user ${user.email}:`, authError.message)
        continue
      }

      // Create user profile
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          name: user.name,
          phone: '5555555555',
          email: user.email,
          address: 'Denver, CO',
          username: user.username,
          display_preference: 'real_name',
          status: 'assigned',
          leader_certified: false,
          is_admin: false
        })

      if (profileError) {
        console.error(`  ❌ Failed to create profile for ${user.email}:`, profileError.message)
        continue
      }

      createdUsers.push({ ...user, id: authData.user.id })
      console.log(`  ✅ Created ${user.name} (${user.email})`)
    } catch (err) {
      console.error(`  ❌ Error creating ${user.email}:`, err.message)
    }
  }

  console.log(`\n✅ Created ${createdUsers.length} users\n`)
  return createdUsers
}

async function createChaptersAndMembers(users) {
  console.log('Creating chapters and assigning members...')
  const createdChapters = []

  // Get Nathan's ID
  const { data: nathan } = await supabase
    .from('users')
    .select('id')
    .eq('email', 'notto@nathanotto.com')
    .single()

  for (let i = 0; i < chapters.length; i++) {
    const chapter = chapters[i]

    // Create chapter
    const { data: chapterData, error: chapterError } = await supabase
      .from('chapters')
      .insert({
        name: chapter.name,
        status: i < 5 ? 'open' : (i === 5 ? 'forming' : 'open'), // 5 open, 1 forming, 1 open
        max_members: 12,
        meeting_schedule: {
          frequency: 'biweekly',
          day_of_week: (i % 7),
          time: '19:00',
          location: { street: chapter.location, city: chapter.city, state: chapter.state, zip: chapter.zip }
        },
        next_meeting_location: { street: chapter.location, city: chapter.city, state: chapter.state, zip: chapter.zip }
      })
      .select()
      .single()

    if (chapterError) {
      console.error(`  ❌ Failed to create ${chapter.name}:`, chapterError.message)
      continue
    }

    console.log(`  ✅ Created ${chapter.name}`)

    // Assign members to chapter (2-4 members per chapter)
    const memberCount = 2 + (i % 3) // 2, 3, or 4 members
    const startIdx = i * 2
    const chapterMembers = users.slice(startIdx, startIdx + memberCount)

    // Add Nathan to first two chapters
    if (i < 2 && nathan) {
      chapterMembers.push({ id: nathan.id, name: 'Nathan Otto' })
    }

    for (const member of chapterMembers) {
      const { error: memberError } = await supabase
        .from('chapter_memberships')
        .insert({
          chapter_id: chapterData.id,
          user_id: member.id,
          joined_at: new Date(Date.now() - (i * 30 * 24 * 60 * 60 * 1000)).toISOString(), // Stagger join dates
          is_active: true
        })

      if (!memberError) {
        console.log(`    - Added ${member.name}`)
      }
    }

    // Assign first member as leader
    if (chapterMembers.length > 0) {
      await supabase
        .from('chapter_roles')
        .insert({
          chapter_id: chapterData.id,
          user_id: chapterMembers[0].id,
          role_type: 'Chapter Leader'
        })

      // Make first member leader certified
      await supabase
        .from('users')
        .update({ leader_certified: true, leader_certification_date: new Date().toISOString() })
        .eq('id', chapterMembers[0].id)
    }

    createdChapters.push({ ...chapterData, members: chapterMembers })
  }

  console.log(`\n✅ Created ${createdChapters.length} chapters\n`)
  return createdChapters
}

async function createMeetingsForChapters(chapters) {
  console.log('Creating meetings for chapters...')

  for (const chapter of chapters) {
    const meetingCount = chapter.status === 'forming' ? 3 : 18 // Forming chapters have fewer meetings

    for (let i = 1; i <= meetingCount; i++) {
      const isPast = i <= (meetingCount - 3)
      const weeksAgo = isPast ? (meetingCount - i) * 2 : 0
      const weeksFromNow = !isPast ? (i - meetingCount + 3) * 2 : 0

      const scheduledDate = new Date()
      if (isPast) {
        scheduledDate.setDate(scheduledDate.getDate() - (weeksAgo * 7))
      } else {
        scheduledDate.setDate(scheduledDate.getDate() + (weeksFromNow * 7))
      }

      const moduleIdx = (i - 1) % 8
      const moduleId = curriculumModules[moduleIdx].id
      const moduleTopic = curriculumModules[moduleIdx].title

      const { data: meeting, error: meetingError } = await supabase
        .from('meetings')
        .insert({
          chapter_id: chapter.id,
          scheduled_datetime: scheduledDate.toISOString(),
          location: chapter.next_meeting_location,
          topic: moduleTopic,
          curriculum_module_id: moduleId,
          status: isPast ? 'completed' : 'scheduled'
        })
        .select()
        .single()

      if (meetingError) continue

      // Add attendance for completed meetings
      if (isPast && chapter.members) {
        for (const member of chapter.members) {
          await supabase
            .from('attendance')
            .insert({
              meeting_id: meeting.id,
              user_id: member.id,
              rsvp_status: 'yes',
              attendance_type: Math.random() > 0.2 ? 'in_person' : 'video',
              checked_in_at: scheduledDate.toISOString()
            })

          // Add feedback
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

    console.log(`  ✅ Created ${meetingCount} meetings for ${chapter.name}`)
  }

  console.log('\n✅ All meetings created\n')
}

async function createCommitments(chapters) {
  console.log('Creating commitments...')
  let commitmentCount = 0

  for (const chapter of chapters) {
    if (!chapter.members || chapter.members.length === 0) continue

    // Create 2-3 commitments per chapter
    const commitmentsToCreate = 2 + Math.floor(Math.random() * 2)

    for (let i = 0; i < commitmentsToCreate; i++) {
      const member = chapter.members[i % chapter.members.length]
      const types = ['stretch_goal', 'volunteer_activity', 'help_favor']
      const type = types[Math.floor(Math.random() * types.length)]

      const descriptions = {
        stretch_goal: [
          'Call my father every Sunday for a month',
          'Attend therapy for 4 consecutive weeks',
          'Have a difficult conversation with my partner'
        ],
        volunteer_activity: [
          'Volunteer at local food bank for 4 hours',
          'Mentor a young man in the community',
          'Help organize community cleanup day'
        ],
        help_favor: [
          'Looking for recommendations for a therapist',
          'Need help moving this weekend',
          'Seeking advice on career transition'
        ]
      }

      const description = descriptions[type][Math.floor(Math.random() * descriptions[type].length)]

      await supabase
        .from('commitments')
        .insert({
          chapter_id: chapter.id,
          made_by: member.id,
          commitment_type: type,
          description: description,
          deadline: new Date(Date.now() + (14 * 24 * 60 * 60 * 1000)).toISOString(), // 2 weeks from now
          status: 'pending'
        })

      commitmentCount++
    }
  }

  console.log(`✅ Created ${commitmentCount} commitments\n`)
}

async function main() {
  console.log('🌱 Starting comprehensive seed...\n')

  try {
    await clearExistingData()
    const users = await createUsers()
    const chapters = await createChaptersAndMembers(users)
    await createMeetingsForChapters(chapters)
    await createCommitments(chapters)

    console.log('🎉 Seed complete!\n')
    console.log('Summary:')
    console.log(`  - ${users.length} users created`)
    console.log(`  - ${chapters.length} chapters created`)
    console.log(`  - Meetings and commitments added`)
    console.log('\nYou can now view all data in admin mode!')

  } catch (err) {
    console.error('Error during seed:', err)
    process.exit(1)
  }
}

main()
