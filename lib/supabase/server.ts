import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const allCookies = cookieStore.getAll()
          console.log('[Server Component] getAll - cookies:', allCookies.length, allCookies.map(c => c.name))
          return allCookies
        },
        setAll(cookiesToSet) {
          // Server Components cannot set cookies - they can only read them.
          // Cookie setting happens in API routes, Server Actions, and middleware.
          console.log('[Server Component] setAll called with', cookiesToSet.length, 'cookies (IGNORING - read-only context)')
          if (cookiesToSet.length > 0) {
            console.log('[Server Component] Cookies that would be set:', cookiesToSet.map(c => `${c.name}=${c.value ? 'EXISTS' : 'EMPTY'}`))
          }
        },
      },
    }
  )
}
