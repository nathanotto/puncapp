require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

const newMembers = [
  { id: 'a1111111-1111-1111-1111-111111111111', email: 'marcus.chen@example.com', name: 'Marcus Chen', rsvp: 'yes' },
  { id: 'a2222222-2222-2222-2222-222222222222', email: 'david.thompson@example.com', name: 'David Thompson', rsvp: 'yes' },
  { id: 'a3333333-3333-3333-3333-333333333333', email: 'james.rodriguez@example.com', name: 'James Rodriguez', rsvp: 'yes' },
  { id: 'a4444444-4444-4444-4444-444444444444', email: 'robert.kim@example.com', name: 'Robert Kim', rsvp: 'yes' },
  { id: 'a5555555-5555-5555-5555-555555555555', email: 'michael.anderson@example.com', name: 'Michael Anderson', rsvp: 'yes' },
  { id: 'a6666666-6666-6666-6666-666666666666', email: 'thomas.wright@example.com', name: 'Thomas Wright', rsvp: 'no', reason: 'Child is sick' },
  { id: 'a7777777-7777-7777-7777-777777777777', email: 'christopher.lee@example.com', name: 'Christopher Lee', rsvp: 'no_response' },
]

const CHAPTER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const MEETING_ID = 'b2c3d4e5-f6a7-8901-bcde-f23456789012'

async function seedOakChapter() {
  console.log('🌳 Seeding The Oak Chapter with 7 members...\n')

  for (const member of newMembers) {
    console.log(`Creating user: ${member.name}...`)

    // 1. Create auth user (this will trigger public.users creation via trigger)
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: member.email,
      password: 'password123', // Default password for test users
      email_confirm: true,
      user_metadata: {
        name: member.name
      }
    })

    let userId = member.id

    if (authError) {
      if ((authError.message && authError.message.toLowerCase().includes('already registered')) ||
          (authError.message && authError.message.toLowerCase().includes('already been registered'))) {
        console.log(`  ⚠️  User already exists, looking up...`)

        // Look up existing user by email to verify they exist
        const { data: existingUser } = await supabase
          .from('users')
          .select('id')
          .eq('email', member.email)
          .single()

        if (existingUser) {
          userId = existingUser.id
          console.log(`  ✅ Found existing user`)
        } else {
          console.log(`  ❌ User exists in auth but not in public.users table`)
          console.log(`  Skipping...`)
          console.log('')
          continue
        }
      } else {
        console.log(`  ❌ Auth creation error: ${authError.message}`)
        console.log(`  Skipping this user...`)
        console.log('')
        continue
      }
    } else {
      console.log(`  ✅ Auth user created`)
      userId = authData.user.id
    }

    // 2. Add as chapter member
    const { error: membershipError } = await supabase
      .from('chapter_memberships')
      .insert({
        chapter_id: CHAPTER_ID,
        user_id: userId,
        role: 'member',
        is_active: true
      })

    if (membershipError) {
      console.log(`  ⚠️  Membership creation failed: ${membershipError.message}`)
    } else {
      console.log(`  ✅ Added to chapter`)
    }

    // 3. Create attendance record
    const attendanceData = {
      meeting_id: MEETING_ID,
      user_id: userId,
      rsvp_status: member.rsvp,
    }

    if (member.rsvp === 'yes') {
      attendanceData.rsvp_at = new Date(Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000).toISOString()
    } else if (member.rsvp === 'no') {
      attendanceData.rsvp_reason = member.reason
      attendanceData.rsvp_at = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    }

    const { error: attendanceError } = await supabase
      .from('attendance')
      .insert(attendanceData)

    if (attendanceError) {
      console.log(`  ⚠️  Attendance creation failed: ${attendanceError.message}`)
    } else {
      console.log(`  ✅ RSVP: ${member.rsvp}${member.reason ? ` ("${member.reason}")` : ''}`)
    }

    // 4. If no_response, create pending task
    if (member.rsvp === 'no_response') {
      const { error: taskError } = await supabase
        .from('pending_tasks')
        .insert({
          task_type: 'respond_to_rsvp',
          assigned_to: userId,
          related_entity_type: 'meeting',
          related_entity_id: MEETING_ID,
          metadata: {
            chapter_name: 'The Oak Chapter',
            meeting_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          },
          due_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString()
        })

      if (taskError) {
        console.log(`  ⚠️  Pending task creation failed: ${taskError.message}`)
      } else {
        console.log(`  ✅ Pending task created`)
      }
    }

    console.log('')
  }

  console.log('🎉 The Oak Chapter now has 8 members!')
  console.log('\nRSVP Summary:')
  console.log('  ✅ 6 Yes')
  console.log('  ❌ 1 No (Thomas Wright: "Child is sick")')
  console.log('  ⏳ 1 No Response (Christopher Lee - has pending task)')
}

seedOakChapter().catch(err => {
  console.error('❌ Seed failed:', err)
  process.exit(1)
})
