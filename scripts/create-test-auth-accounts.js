require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const CHAPTER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const PASSWORD = 'testpassword123'

async function createTestAuthAccounts() {
  console.log('🔐 Creating test auth accounts...\n')

  // Get all chapter members
  const { data: members, error: membersError } = await supabase
    .from('chapter_memberships')
    .select(`
      user_id,
      role,
      users!inner (
        id,
        name,
        username,
        email
      )
    `)
    .eq('chapter_id', CHAPTER_ID)
    .eq('is_active', true)

  if (membersError) {
    console.error('Failed to fetch members:', membersError)
    return
  }

  console.log(`Found ${members.length} chapter members\n`)

  for (const member of members) {
    const user = member.users
    const email = user.email

    if (!email) {
      console.log(`⚠️  Skipping ${user.name} - no email set`)
      continue
    }

    console.log(`Creating auth account for ${user.name} (${user.username || 'no username'})...`)
    console.log(`  Email: ${email}`)
    console.log(`  Password: ${PASSWORD}`)

    // Check if auth user already exists
    const { data: existingAuthUsers } = await supabase.auth.admin.listUsers()
    const existingAuthUser = existingAuthUsers?.users?.find(u => u.email === email)

    if (existingAuthUser) {
      console.log(`  ℹ️  Auth account already exists`)

      // Update password in case it changed
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingAuthUser.id,
        { password: PASSWORD }
      )

      if (updateError) {
        console.log(`  ⚠️  Failed to update password: ${updateError.message}`)
      } else {
        console.log(`  ✅ Password updated`)
      }
    } else {
      // Create new auth user
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: PASSWORD,
        email_confirm: true, // Auto-confirm email
        user_metadata: {
          name: user.name,
          username: user.username,
        }
      })

      if (authError) {
        console.log(`  ❌ Failed to create: ${authError.message}`)
      } else {
        console.log(`  ✅ Auth account created`)

        // Update public.users to link the auth user
        const { error: updateError } = await supabase
          .from('users')
          .update({ id: authUser.user.id })
          .eq('id', user.id)

        if (updateError) {
          console.log(`  ⚠️  Warning: Could not link public.users record`)
        }
      }
    }

    console.log('')
  }

  console.log('✅ All test auth accounts created!\n')
  console.log('📋 Login Credentials:\n')
  console.log('All users have password: testpassword123\n')

  members.forEach(member => {
    if (member.users.email) {
      console.log(`${member.users.name}:`)
      console.log(`  Email: ${member.users.email}`)
      console.log(`  Role: ${member.role}`)
      console.log('')
    }
  })

  console.log('🧪 To test real-time updates:\n')
  console.log('1. Open http://localhost:3000/meetings/e5f6a7b8-c9d0-1234-ef01-567890123456 in your main browser')
  console.log('2. Open an incognito/private window')
  console.log('3. Log in as one of the other users (e.g., marcus@example.com)')
  console.log('4. Check them in at: http://localhost:3000/tasks/meeting-cycle/check-in?meeting=e5f6a7b8-c9d0-1234-ef01-567890123456')
  console.log('5. Watch your main window update automatically!')
  console.log('')
}

createTestAuthAccounts().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
