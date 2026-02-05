import { createServiceRoleClient } from '@/lib/supabase/service-role';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const supabase = createServiceRoleClient();

    // Enable realtime for attendance table
    const { error } = await supabase.rpc('exec_sql', {
      sql: `
        DO $$
        BEGIN
          IF NOT EXISTS (
            SELECT 1 FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
            AND schemaname = 'public'
            AND tablename = 'attendance'
          ) THEN
            ALTER PUBLICATION supabase_realtime ADD TABLE attendance;
          END IF;
        END $$;
      `
    });

    if (error) {
      console.error('Error enabling realtime:', error);
      return NextResponse.json({ success: false, error: error.message });
    }

    return NextResponse.json({ success: true, message: 'Realtime enabled for attendance table' });
  } catch (error: any) {
    console.error('Error:', error);
    return NextResponse.json({ success: false, error: error.message });
  }
}
