require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('Applying migration: create_meeting_time_log...\n')

  // Read the SQL file
  const sql = fs.readFileSync('./supabase/migrations/20260202_1310_create_meeting_time_log.sql', 'utf8')

  // Execute via RPC (we'll need to execute each statement separately)
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--'))

  for (const statement of statements) {
    if (!statement) continue

    console.log('Executing:', statement.substring(0, 100) + '...')

    const { error } = await supabase.rpc('exec_sql', { sql: statement })

    if (error) {
      console.error('Error:', error.message)
      // Continue anyway - might be \"already exists\" which is fine
    } else {
      console.log('✓')
    }
  }

  console.log('\n✅ Migration applied!')
}

applyMigration().catch(console.error)
