require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

const CHAPTER_ID = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

async function checkEmails() {
  const { data: members } = await supabase
    .from('chapter_memberships')
    .select(`
      users!inner (
        id,
        name,
        username,
        email
      )
    `)
    .eq('chapter_id', CHAPTER_ID)
    .eq('is_active', true)

  console.log('Current user emails:\n')
  members?.forEach(m => {
    console.log(`${m.users.name}: ${m.users.email || 'NO EMAIL SET'}`)
  })
}

checkEmails().catch(console.error)
