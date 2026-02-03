require('dotenv').config({ path: '.env.local' })
const { Pool } = require('pg')

// Direct connection to Supabase database
const pool = new Pool({
  host: 'aws-0-us-west-1.pooler.supabase.com',
  port: 6543,
  database: 'postgres',
  user: 'postgres.krfbavajdsgehhfngpcs',
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: false }
})

async function applySchema() {
  console.log('Applying Session 5 schema changes...\n')

  try {
    // Step 1: Add columns to meetings table
    console.log('Adding duration_minutes column...')
    await pool.query(`
      ALTER TABLE meetings
      ADD COLUMN IF NOT EXISTS duration_minutes integer DEFAULT 120
    `)
    console.log('✓ Added duration_minutes')

    console.log('Adding current_section column...')
    await pool.query(`
      ALTER TABLE meetings
      ADD COLUMN IF NOT EXISTS current_section text DEFAULT 'not_started'
    `)
    console.log('✓ Added current_section')

    console.log('Adding check constraint...')
    await pool.query(`
      ALTER TABLE meetings
      DROP CONSTRAINT IF EXISTS meetings_current_section_check
    `)
    await pool.query(`
      ALTER TABLE meetings
      ADD CONSTRAINT meetings_current_section_check
      CHECK (current_section IN (
        'not_started', 'opening_meditation', 'opening_ethos',
        'lightning_round', 'full_checkins', 'closing', 'ended'
      ))
    `)
    console.log('✓ Added check constraint')

    // Step 2: Create meeting_time_log table
    console.log('\nCreating meeting_time_log table...')
    await pool.query(`
      CREATE TABLE IF NOT EXISTS meeting_time_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
        section text NOT NULL CHECK (section IN (
          'opening_meditation', 'opening_ethos', 'lightning_round',
          'full_checkins', 'closing'
        )),
        user_id uuid REFERENCES public.users(id),
        start_time timestamptz NOT NULL,
        end_time timestamptz,
        duration_seconds integer,
        overtime_seconds integer DEFAULT 0,
        priority integer CHECK (priority IN (1, 2)),
        skipped boolean DEFAULT false,
        created_at timestamptz DEFAULT now()
      )
    `)
    console.log('✓ Created meeting_time_log table')

    console.log('Creating indexes...')
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_meeting_time_log_meeting
      ON meeting_time_log(meeting_id, section)
    `)
    console.log('✓ Created indexes')

    console.log('Enabling RLS...')
    await pool.query(`ALTER TABLE meeting_time_log ENABLE ROW LEVEL SECURITY`)
    console.log('✓ Enabled RLS')

    console.log('Creating RLS policies...')
    await pool.query(`DROP POLICY IF EXISTS "Users can view meeting time logs in their chapters" ON meeting_time_log`)
    await pool.query(`
      CREATE POLICY "Users can view meeting time logs in their chapters"
      ON meeting_time_log FOR SELECT USING (
        meeting_id IN (
          SELECT m.id FROM meetings m
          JOIN chapter_memberships cm ON cm.chapter_id = m.chapter_id
          WHERE cm.user_id = auth.uid()
        )
      )
    `)

    await pool.query(`DROP POLICY IF EXISTS "Authenticated users can manage meeting time logs" ON meeting_time_log`)
    await pool.query(`
      CREATE POLICY "Authenticated users can manage meeting time logs"
      ON meeting_time_log FOR ALL
      USING (auth.role() = 'authenticated')
    `)
    console.log('✓ Created RLS policies')

    console.log('\n✅ Schema migration complete!')

  } catch (error) {
    console.error('Error:', error.message)
  } finally {
    await pool.end()
  }
}

applySchema()
