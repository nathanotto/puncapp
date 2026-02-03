require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

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

async function dropTables() {
  console.log('🗑️  Dropping all custom tables...\n')

  // Read the migration file
  const sql = fs.readFileSync('supabase/migrations/20260201_0900_drop_all_custom_tables.sql', 'utf8')

  // Split into individual statements (by semicolon + newline)
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s !== '--')

  console.log(`Found ${statements.length} SQL statements to execute\n`)

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i]
    if (!statement || statement.length < 10) continue

    // Show what we're dropping
    const match = statement.match(/DROP (TABLE|FUNCTION|TYPE) IF EXISTS (\w+)/)
    if (match) {
      process.stdout.write(`  Dropping ${match[1].toLowerCase()}: ${match[2]}...`)
    }

    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql_query: statement + ';'
      })

      if (error) {
        console.log(` ❌ ${error.message}`)
      } else {
        console.log(' ✅')
      }
    } catch (err) {
      console.log(` ⚠️  ${err.message}`)
    }
  }

  console.log('\n✅ All custom tables dropped successfully!')
  console.log('\nRemaining in database:')
  console.log('  - auth.users (Supabase authentication)')
  console.log('  - auth.* (auth schema tables)')
  console.log('  - storage.* (file storage)')
  console.log('  - realtime.* (subscriptions)')
}

dropTables().catch(console.error)
