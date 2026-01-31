import { createClient } from '@/lib/supabase/client'
import type { User } from '@/types/database'

export interface SignUpData {
  email: string
  password: string
  name: string
  phone: string
  address: string
  username: string
  displayPreference?: 'real_name' | 'username'
}

export interface SignInData {
  email: string
  password: string
}

/**
 * Sign up a new user with Supabase Auth and create their profile
 */
export async function signUp(data: SignUpData) {
  const supabase = createClient()

  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: data.email,
    password: data.password,
  })

  if (authError) {
    return { user: null, error: authError.message }
  }

  if (!authData.user) {
    return { user: null, error: 'Failed to create user' }
  }

  // 2. Create user profile
  const { error: profileError } = await supabase
    .from('users')
    .insert({
      id: authData.user.id,
      name: data.name,
      phone: data.phone,
      email: data.email,
      address: data.address,
      username: data.username,
      display_preference: data.displayPreference || 'real_name',
      status: 'unassigned',
      leader_certified: false,
    })

  if (profileError) {
    // If profile creation fails, we should ideally clean up the auth user
    // but for now, return the error
    return { user: null, error: `Profile creation failed: ${profileError.message}` }
  }

  return { user: authData.user, error: null }
}

/**
 * Sign in an existing user
 */
export async function signIn(data: SignInData) {
  const supabase = createClient()

  const { data: authData, error } = await supabase.auth.signInWithPassword({
    email: data.email,
    password: data.password,
  })

  if (error) {
    return { user: null, error: error.message }
  }

  return { user: authData.user, error: null }
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()
  return { error: error?.message || null }
}

/**
 * Get the current user session
 */
export async function getSession() {
  const supabase = createClient()
  const { data: { session }, error } = await supabase.auth.getSession()

  if (error) {
    return { session: null, error: error.message }
  }

  return { session, error: null }
}

/**
 * Get the current user profile from our users table
 */
export async function getUserProfile(userId: string): Promise<{ profile: User | null; error: string | null }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    return { profile: null, error: error.message }
  }

  return { profile: data as User, error: null }
}
