import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ memberId: string }>
}

// POST /api/admin/members/[memberId]/chapters - Add member to chapter
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

    // Get data from request body
    const body = await req.json()
    const { chapterId, role } = body

    if (!chapterId || !role) {
      return NextResponse.json({ error: 'Chapter ID and role are required' }, { status: 400 })
    }

    // Validate role
    const validRoles = ['member', 'backup_leader', 'leader']
    if (!validRoles.includes(role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 })
    }

    // Check if member already has an active membership in this chapter
    const { data: existingMembership } = await supabase
      .from('chapter_memberships')
      .select('id')
      .eq('chapter_id', chapterId)
      .eq('user_id', memberId)
      .eq('is_active', true)
      .single()

    if (existingMembership) {
      return NextResponse.json({ error: 'Member already in this chapter' }, { status: 400 })
    }

    // Create membership
    const { error: insertError } = await supabase
      .from('chapter_memberships')
      .insert({
        chapter_id: chapterId,
        user_id: memberId,
        role,
        is_active: true,
      })

    if (insertError) {
      console.error('Error creating membership:', insertError)
      return NextResponse.json({ error: 'Failed to add member to chapter' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in add to chapter route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
