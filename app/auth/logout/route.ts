import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath('/', 'layout');
  return NextResponse.redirect(new URL('/auth/login', request.url));
}

export async function GET(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  revalidatePath('/', 'layout');
  return NextResponse.redirect(new URL('/auth/login', request.url));
}
