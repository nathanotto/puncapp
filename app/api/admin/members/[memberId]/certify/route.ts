import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ memberId: string }>
}

// POST /api/admin/members/[memberId]/certify - Certify member as leader
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { memberId } = await context.params

    // Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser } = await supabase
      .from('users')
      .select('is_punc_admin')
      .eq('id', user.id)
      .single()

    if (!adminUser?.is_punc_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Set certification (valid for 1 year)
    const now = new Date()
    const expiresAt = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)

    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_leader_certified: true,
        leader_certified_at: now.toISOString(),
        leader_certification_expires_at: expiresAt.toISOString(),
      })
      .eq('id', memberId)

    if (updateError) {
      console.error('Error certifying member:', updateError)
      return NextResponse.json({ error: 'Failed to certify member' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in certify route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/members/[memberId]/certify - Revoke leader certification
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { memberId } = await context.params

    // Verify admin access
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: adminUser } = await supabase
      .from('users')
      .select('is_punc_admin')
      .eq('id', user.id)
      .single()

    if (!adminUser?.is_punc_admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Remove certification
    const { error: updateError } = await supabase
      .from('users')
      .update({
        is_leader_certified: false,
        leader_certified_at: null,
        leader_certification_expires_at: null,
      })
      .eq('id', memberId)

    if (updateError) {
      console.error('Error revoking certification:', updateError)
      return NextResponse.json({ error: 'Failed to revoke certification' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in revoke route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
