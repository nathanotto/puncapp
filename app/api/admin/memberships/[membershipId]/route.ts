import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ membershipId: string }>
}

// PATCH /api/admin/memberships/[membershipId] - Change member role
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { membershipId } = await context.params

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

    // Get role from request body
    const body = await req.json()
    const { role } = body

    // Validate role
    const validRoles = ['member', 'backup_leader', 'leader']
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Update membership role
    const { error: updateError } = await supabase
      .from('chapter_memberships')
      .update({ role })
      .eq('id', membershipId)

    if (updateError) {
      console.error('Error updating membership role:', updateError)
      return NextResponse.json({ error: 'Failed to update role' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in membership update route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/memberships/[membershipId] - Remove member from chapter
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { membershipId } = await context.params

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

    // Set membership to inactive
    const { error: updateError } = await supabase
      .from('chapter_memberships')
      .update({ is_active: false })
      .eq('id', membershipId)

    if (updateError) {
      console.error('Error removing membership:', updateError)
      return NextResponse.json({ error: 'Failed to remove membership' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in membership delete route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
