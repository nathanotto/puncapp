require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase credentials')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function applyMigration() {
  console.log('📝 Reading migration file...')
  const sql = fs.readFileSync('supabase/migrations/20260204110000_add_meeting_timer_fields.sql', 'utf8')

  console.log('🚀 Applying migration...')

  // Split by semicolon and execute each statement
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !s.startsWith('--'))

  for (const statement of statements) {
    if (statement.trim()) {
      console.log(`Executing: ${statement.substring(0, 60)}...`)
      const { error } = await supabase.rpc('exec_sql', { sql: statement })

      if (error) {
        console.error('❌ Error:', error)
        process.exit(1)
      }
    }
  }

  console.log('✅ Migration applied successfully!')
}

applyMigration().catch(console.error)
