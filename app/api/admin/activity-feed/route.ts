import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Verify admin
  const { data: userData } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single();

  if (!userData?.is_punc_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Parse query params
  const searchParams = request.nextUrl.searchParams;
  const chapterId = searchParams.get('chapter_id');
  const action = searchParams.get('action');
  const limit = parseInt(searchParams.get('limit') || '50', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Build query
  let query = supabase
    .from('activity_log')
    .select(`
      id,
      created_at,
      actor_id,
      actor_type,
      action,
      entity_type,
      entity_id,
      chapter_id,
      summary,
      details,
      users:actor_id (id, name),
      chapters:chapter_id (id, name)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Apply filters
  if (chapterId) {
    query = query.eq('chapter_id', chapterId);
  }

  if (action) {
    query = query.eq('action', action);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching activity feed:', error);
    return NextResponse.json({ error: 'Failed to fetch activity feed' }, { status: 500 });
  }

  return NextResponse.json({
    activities: data,
    total: count,
    limit,
    offset,
  });
}
