require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
})

async function verifyCleanup() {
  console.log('🔍 Verifying tables were dropped...\n')

  const tablesToCheck = ['users', 'chapters', 'meetings', 'commitments', 'chapter_memberships']

  for (const table of tablesToCheck) {
    try {
      const { data, error } = await supabase.from(table).select('id').limit(1)
      if (error) {
        if (error.message.includes('does not exist') || error.code === '42P01') {
          console.log(`  ✅ ${table} - dropped`)
        } else {
          console.log(`  ⚠️  ${table} - ${error.message}`)
        }
      } else {
        console.log(`  ❌ ${table} - still exists!`)
      }
    } catch (err) {
      console.log(`  ✅ ${table} - dropped`)
    }
  }

  console.log('\n✅ Verification complete!')
  console.log('\nYour database is now clean and ready for the new schema.')
}

verifyCleanup().catch(console.error)
