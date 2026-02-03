require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const CHAPTER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'
const PASSWORD = 'testpassword123'
const YOUR_USER_ID = '78d0b1d5-08a6-4923-8bef-49d804cafa73'

async function createTestAuthAccounts() {
  console.log('🔐 Creating test auth accounts with matching IDs...\n')

  // Get all chapter members except you (you already have auth)
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
    .neq('user_id', YOUR_USER_ID) // Skip your account

  if (membersError) {
    console.error('Failed to fetch members:', membersError)
    return
  }

  console.log(`Found ${members.length} test users (excluding you)\n`)

  const createdAccounts = []

  for (const member of members) {
    const user = member.users
    const email = user.email

    console.log(`Creating auth for ${user.name}...`)
    console.log(`  ID: ${user.id}`)
    console.log(`  Email: ${email}`)

    try {
      // Create auth user with specific ID to match public.users
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        id: user.id, // Use the existing public.users ID!
        email: email,
        password: PASSWORD,
        email_confirm: true,
        user_metadata: {
          name: user.name,
          username: user.username,
        }
      })

      if (authError) {
        // Check if it's because user already exists
        if (authError.message?.includes('already') || authError.message?.includes('exists')) {
          console.log(`  ℹ️  Auth account already exists, updating password...`)

          const { error: updateError } = await supabase.auth.admin.updateUserById(
            user.id,
            { password: PASSWORD }
          )

          if (updateError) {
            console.log(`  ⚠️  Failed to update: ${updateError.message}`)
          } else {
            console.log(`  ✅ Password updated`)
            createdAccounts.push({ name: user.name, email, password: PASSWORD })
          }
        } else {
          console.log(`  ❌ Error: ${authError.message}`)
        }
      } else {
        console.log(`  ✅ Auth account created`)
        createdAccounts.push({ name: user.name, email, password: PASSWORD })

        // The trigger will try to create public.users but it already exists
        // This will cause an error in the trigger, but the auth user is created
        // We need to catch and ignore this error

        // Delete the duplicate public.users that the trigger might have tried to create
        // (Actually the trigger will fail on the INSERT, so nothing to clean up)
      }
    } catch (error) {
      console.log(`  ❌ Unexpected error: ${error.message}`)
    }

    console.log('')
  }

  console.log('✅ All test auth accounts ready!\n')
  console.log('📋 Login Credentials (all passwords: testpassword123):\n')

  createdAccounts.forEach(account => {
    console.log(`${account.name}:`)
    console.log(`  Email: ${account.email}`)
    console.log('')
  })

  console.log('🧪 To test real-time updates:\n')
  console.log('1. Main browser: http://localhost:3000/meetings/e5f6a7b8-c9d0-1234-ef01-567890123456')
  console.log('2. Incognito window: http://localhost:3000/auth/login')
  console.log('3. Log in as marcus.chen@example.com / testpassword123')
  console.log('4. Check in: http://localhost:3000/tasks/meeting-cycle/check-in?meeting=e5f6a7b8-c9d0-1234-ef01-567890123456')
  console.log('5. Watch your main window update in real-time!')
  console.log('')
}

createTestAuthAccounts().catch(err => {
  console.error('❌ Failed:', err)
  process.exit(1)
})
