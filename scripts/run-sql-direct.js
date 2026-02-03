require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

// Parse the DATABASE_URL from Supabase
const databaseUrl = process.env.DATABASE_URL ||
  `postgresql://postgres.krfbavajdsgehhfngpcs:${process.env.SUPABASE_DB_PASSWORD}@aws-0-us-west-1.pooler.supabase.com:6543/postgres`

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
})

async function runSQL() {
  console.log('Applying migration...\n')

  try {
    // Add duration_minutes column
    await pool.query(`
      ALTER TABLE meetings
        ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 120
    `)
    console.log('✓ Added duration_minutes column')

    // Add current_section column
    await pool.query(`
      ALTER TABLE meetings
        ADD COLUMN IF NOT EXISTS current_section text CHECK (current_section IN (
          'not_started',
          'opening_meditation',
          'opening_ethos',
          'lightning_round',
          'full_checkins',
          'closing',
          'ended'
        )) DEFAULT 'not_started'
    `)
    console.log('✓ Added current_section column')

    // Update existing meetings
    await pool.query(`
      UPDATE meetings
        SET current_section = 'not_started'
        WHERE current_section IS NULL
    `)
    console.log('✓ Updated existing meetings')

    console.log('\n✅ Migration complete!')
  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

runSQL()
