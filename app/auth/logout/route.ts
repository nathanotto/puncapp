import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath('/', 'layout');
  return NextResponse.redirect(new URL('/auth/login', request.url));
}

// GET removed - logout should only work via POST for security.
// Next.js prefetches GET routes which was triggering automatic logout!
