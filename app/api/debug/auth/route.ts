import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function GET() {
  const cookieStore = await cookies()
  const allCookies = cookieStore.getAll()

  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  return NextResponse.json({
    hasUser: !!user,
    userId: user?.id,
    userEmail: user?.email,
    error: error?.message,
    cookieCount: allCookies.length,
    cookieNames: allCookies.map(c => c.name),
    supabaseCookies: allCookies
      .filter(c => c.name.includes('supabase') || c.name.includes('auth'))
      .map(c => ({ name: c.name, hasValue: !!c.value })),
    env: {
      hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      supabaseUrlPrefix: process.env.NEXT_PUBLIC_SUPABASE_URL?.substring(0, 20),
    }
  }, { status: 200 })
}
