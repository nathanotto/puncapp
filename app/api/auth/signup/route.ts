import { createServerClient } from '@supabase/ssr';
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    const { email, password, name } = await request.json();

    const cookieStore = await cookies();
    let response = NextResponse.json({ success: true });

    // Create Supabase client with cookie handlers that set cookies on the response
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            // Set cookies on the response object
            cookiesToSet.forEach(({ name, value, options }) => {
              // Force secure: true and httpOnly: true for production
              const secureOptions = {
                ...options,
                secure: true,
                httpOnly: true,
              };
              response.cookies.set(name, value, secureOptions);
            });
          },
        },
      }
    );

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
        },
      },
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Return the response with cookies already set
    return response;
  } catch (error) {
    console.error('[Auth Signup] Error:', error);
    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
