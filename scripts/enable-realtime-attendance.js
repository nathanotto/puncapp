import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function enableRealtimeAttendance() {
  console.log('Enabling realtime for attendance table...');

  const { data, error } = await supabase.rpc('exec_sql', {
    sql: `
      DO $$
      BEGIN
        -- Add attendance if not already present
        IF NOT EXISTS (
          SELECT 1 FROM pg_publication_tables
          WHERE pubname = 'supabase_realtime'
          AND schemaname = 'public'
          AND tablename = 'attendance'
        ) THEN
          ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
          RAISE NOTICE 'Added attendance table to realtime publication';
        ELSE
          RAISE NOTICE 'Attendance table already in realtime publication';
        END IF;
      END $$;
    `
  });

  if (error) {
    console.error('Error enabling realtime:', error);
    process.exit(1);
  }

  console.log('✓ Realtime enabled for attendance table');
}

enableRealtimeAttendance();
