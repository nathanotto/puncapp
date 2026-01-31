import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { User } from '@/types/database'

/**
 * Get the current authenticated user (server-side)
 * Returns null if not authenticated
 */
export async function getCurrentUser() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    return null
  }

  return user
}

/**
 * Get the current user's profile from our users table (server-side)
 */
export async function getCurrentUserProfile(): Promise<User | null> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('users')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return null
  }

  return profile as User
}

/**
 * Require authentication - redirect to sign in if not authenticated
 */
export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  return user
}

/**
 * Require authentication and return user profile
 */
export async function requireAuthWithProfile() {
  const user = await getCurrentUser()

  if (!user) {
    redirect('/auth/signin')
  }

  const profile = await getCurrentUserProfile()

  if (!profile) {
    // User is authenticated but no profile exists
    // This shouldn't happen, but handle gracefully
    redirect('/auth/setup-profile')
  }

  return profile
}
