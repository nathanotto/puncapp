require('dotenv').config({ path: '.env.local' })
const { createClient } = require('@supabase/supabase-js')
const fs = require('fs')

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function applyMigration() {
  console.log('Creating meeting_time_log table...\n')

  try {
    // Create table
    await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE TABLE IF NOT EXISTS meeting_time_log (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
          section text NOT NULL CHECK (section IN (
            'opening_meditation',
            'opening_ethos',
            'lightning_round',
            'full_checkins',
            'closing'
          )),
          member_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
          started_at timestamptz NOT NULL DEFAULT now(),
          ended_at timestamptz,
          duration_seconds integer GENERATED ALWAYS AS (
            EXTRACT(EPOCH FROM (ended_at - started_at))::integer
          ) STORED,
          created_at timestamptz DEFAULT now(),
          updated_at timestamptz DEFAULT now()
        )
      `
    })
    console.log('✓ Created meeting_time_log table')

    // Create indexes
    await supabase.rpc('exec_sql', {
      sql_query: 'CREATE INDEX IF NOT EXISTS idx_meeting_time_log_meeting_id ON meeting_time_log(meeting_id)'
    })
    console.log('✓ Created meeting_id index')

    await supabase.rpc('exec_sql', {
      sql_query: 'CREATE INDEX IF NOT EXISTS idx_meeting_time_log_section ON meeting_time_log(section)'
    })
    console.log('✓ Created section index')

    await supabase.rpc('exec_sql', {
      sql_query: 'CREATE INDEX IF NOT EXISTS idx_meeting_time_log_member ON meeting_time_log(member_user_id)'
    })
    console.log('✓ Created member index')

    // Enable RLS
    await supabase.rpc('exec_sql', {
      sql_query: 'ALTER TABLE meeting_time_log ENABLE ROW LEVEL SECURITY'
    })
    console.log('✓ Enabled RLS')

    // Drop existing policies if they exist
    await supabase.rpc('exec_sql', {
      sql_query: 'DROP POLICY IF EXISTS "Chapter members can view meeting time logs" ON meeting_time_log'
    })
    await supabase.rpc('exec_sql', {
      sql_query: 'DROP POLICY IF EXISTS "Meeting runner can manage time logs" ON meeting_time_log'
    })

    // Create RLS policies
    await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE POLICY "Chapter members can view meeting time logs"
          ON meeting_time_log FOR SELECT
          USING (
            EXISTS (
              SELECT 1 FROM meetings m
              JOIN chapter_memberships cm ON cm.chapter_id = m.chapter_id
              WHERE m.id = meeting_time_log.meeting_id
                AND cm.user_id = auth.uid()
                AND cm.is_active = true
            )
          )
      `
    })
    console.log('✓ Created view policy')

    await supabase.rpc('exec_sql', {
      sql_query: `
        CREATE POLICY "Meeting runner can manage time logs"
          ON meeting_time_log FOR ALL
          USING (
            EXISTS (
              SELECT 1 FROM meetings m
              JOIN attendance a ON a.meeting_id = m.id
              WHERE m.id = meeting_time_log.meeting_id
                AND a.user_id = auth.uid()
                AND a.is_runner = true
                AND m.status = 'in_progress'
            )
          )
      `
    })
    console.log('✓ Created manage policy')

    console.log('\n✅ Migration complete!')
  } catch (error) {
    console.error('❌ Error:', error.message)
  }
}

applyMigration().catch(console.error)
