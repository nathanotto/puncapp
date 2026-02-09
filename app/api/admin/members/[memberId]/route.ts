import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ memberId: string }>
}

// PATCH /api/admin/members/[memberId] - Update member fields
export async function PATCH(req: NextRequest, context: RouteContext) {
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

    // Get update data from request body
    const body = await req.json()
    const {
      name,
      username,
      email,
      phone,
      address,
      is_tester,
      is_punc_admin,
    } = body

    console.log('[Member Update] Received data:', { is_tester, is_punc_admin })

    // Validate required fields
    if (!name || !email) {
      return NextResponse.json({ error: 'Name and email are required' }, { status: 400 })
    }

    // Update user
    const updateData = {
      name,
      username,
      email,
      phone,
      address,
      is_tester: is_tester ?? false,
      is_punc_admin: is_punc_admin ?? false,
    }
    console.log('[Member Update] Updating with:', updateData)

    const { error: updateError } = await supabase
      .from('users')
      .update(updateData)
      .eq('id', memberId)

    if (updateError) {
      console.error('Error updating member:', updateError)
      return NextResponse.json({ error: 'Failed to update member' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in member update route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
