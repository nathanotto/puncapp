const { createClient } = require('@supabase/supabase-js')
require('dotenv').config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkUserRoles() {
  console.log('🔍 Checking Nathan Otto\'s chapter roles...\n')

  // Find Nathan Otto
  const { data: nathan } = await supabase
    .from('users')
    .select('id, name, username')
    .eq('username', 'notto')
    .single()

  if (!nathan) {
    console.log('❌ Nathan Otto not found')
    return
  }

  console.log(`User: ${nathan.name} (@${nathan.username})`)
  console.log(`ID: ${nathan.id}\n`)

  // Get his memberships
  const { data: memberships } = await supabase
    .from('chapter_memberships')
    .select('role, is_active, chapters(id, name)')
    .eq('user_id', nathan.id)

  console.log('Chapter Memberships:')
  memberships?.forEach(m => {
    console.log(`  - ${m.chapters.name}: ${m.role} ${m.is_active ? '(active)' : '(inactive)'}`)
  })

  const canDeleteMeetings = memberships?.some(m =>
    m.is_active && (m.role === 'leader' || m.role === 'backup_leader')
  )

  console.log(`\n${canDeleteMeetings ? '✓' : '❌'} Can delete meetings: ${canDeleteMeetings}`)
}

checkUserRoles()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
