const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function findNathan() {
  console.log('🔍 Searching for Nathan...\n')

  // Find all users with Nathan in the name
  const { data: users } = await supabase
    .from('users')
    .select('id, name, username')
    .ilike('name', '%nathan%')

  console.log(`Found ${users?.length || 0} users with "Nathan" in name:\n`)

  for (const user of users || []) {
    console.log(`${user.name} (@${user.username})`)
    console.log(`  ID: ${user.id}`)

    // Get memberships
    const { data: memberships } = await supabase
      .from('chapter_memberships')
      .select('role, is_active, chapters(name)')
      .eq('user_id', user.id)

    if (memberships && memberships.length > 0) {
      memberships.forEach(m => {
        console.log(`  - ${m.chapters.name}: ${m.role} ${m.is_active ? '(active)' : '(inactive)'}`)
      })
    } else {
      console.log(`  - No chapter memberships`)
    }
    console.log()
  }
}

findNathan()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
