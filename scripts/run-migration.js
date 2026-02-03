require('dotenv').config({ path: '.env.local' })
const fs = require('fs')
const path = require('path')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing environment variables')
  process.exit(1)
}

async function runMigration(migrationFile) {
  console.log(`\n🔄 Running migration: ${path.basename(migrationFile)}\n`)

  // Read the SQL file
  const sql = fs.readFileSync(migrationFile, 'utf8')

  // Split into statements (separated by semicolon followed by newline)
  const statements = sql
    .split(/;\s*\n/)
    .map(s => s.trim())
    .filter(s => s && !s.startsWith('--') && s.length > 10)

  console.log(`Found ${statements.length} SQL statements\n`)

  // Execute each statement via Supabase Management API
  let successCount = 0
  let errorCount = 0

  for (let i = 0; i < statements.length; i++) {
    const statement = statements[i] + ';'

    // Show what we're executing (first 80 chars)
    const preview = statement.substring(0, 80).replace(/\s+/g, ' ')
    process.stdout.write(`  [${i + 1}/${statements.length}] ${preview}...`)

    try {
      // Use Supabase REST API to execute SQL
      const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': supabaseServiceKey,
          'Authorization': `Bearer ${supabaseServiceKey}`,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify({ query: statement })
      })

      if (response.ok || response.status === 204) {
        console.log(' ✅')
        successCount++
      } else {
        const error = await response.text()
        console.log(` ⚠️  ${error}`)
        errorCount++
      }
    } catch (err) {
      console.log(` ⚠️  ${err.message}`)
      errorCount++
    }

    // Small delay to avoid rate limiting
    await new Promise(resolve => setTimeout(resolve, 100))
  }

  console.log(`\n📊 Results: ${successCount} succeeded, ${errorCount} failed`)

  if (errorCount > 0) {
    console.log('\n⚠️  Some statements failed. You may need to run this SQL manually in Supabase SQL Editor:')
    console.log(`   File: ${migrationFile}`)
  } else {
    console.log('\n✅ Migration completed successfully!')
  }
}

// Get migration file from command line argument
const migrationFile = process.argv[2] || 'supabase/migrations/20260201_1000_create_pending_tasks.sql'

if (!fs.existsSync(migrationFile)) {
  console.error(`❌ Migration file not found: ${migrationFile}`)
  process.exit(1)
}

runMigration(migrationFile).catch(err => {
  console.error('\n❌ Migration failed:', err.message)
  process.exit(1)
})
