import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email, password } = await request.json();
    console.log('[Auth Login] Starting login for:', email);

    const cookieStore = await cookies();
    let response = NextResponse.json({ success: true });
    let cookiesSet = 0;

    // Create Supabase client with cookie handlers that set cookies on the response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            const allCookies = cookieStore.getAll();
            console.log('[Auth Login] Getting cookies, count:', allCookies.length);
            return allCookies;
          },
          setAll(cookiesToSet) {
            console.log('[Auth Login] setAll called with', cookiesToSet.length, 'cookies');
            // Set cookies on the response object
            cookiesToSet.forEach(({ name, value, options }) => {
              console.log('[Auth Login] Setting cookie:', name, 'with options:', options);
              response.cookies.set(name, value, options);
              cookiesSet++;
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      console.error('[Auth Login] Auth error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('[Auth Login] Success! User:', data.user?.email, 'Cookies set:', cookiesSet);
    const responseCookies = response.cookies.getAll();
    console.log('[Auth Login] Response cookies:', responseCookies);

    // Create new response with debug info but preserve cookies
    const debugResponse = NextResponse.json({
      success: true,
      debug: {
        cookiesSet,
        cookieNames: responseCookies.map(c => c.name),
      }
    });

    // Copy all cookies from original response to debug response
    responseCookies.forEach(cookie => {
      debugResponse.cookies.set(cookie.name, cookie.value);
    });

    return debugResponse;
  } catch (error) {
    console.error('[Auth Login] Unexpected error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
