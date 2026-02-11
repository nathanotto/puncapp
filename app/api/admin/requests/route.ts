import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const supabase = await createClient();

  // Check admin access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_punc_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // Parse query parameters
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const type = searchParams.get('type');

  // Build query
  let query = supabase
    .from('chapter_lifecycle_requests')
    .select('*')
    .order('submitted_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false });

  // Apply filters
  if (status) {
    if (status === 'pending') {
      query = query.in('status', ['submitted', 'in_review']);
    } else {
      query = query.eq('status', status);
    }
  }

  if (type && ['formation', 'split', 'dissolution'].includes(type)) {
    query = query.eq('request_type', type);
  }

  const { data: requests, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(requests);
}
