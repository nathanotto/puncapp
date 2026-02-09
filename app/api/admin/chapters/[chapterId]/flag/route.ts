import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ chapterId: string }>
}

// POST /api/admin/chapters/[chapterId]/flag - Flag a chapter
export async function POST(req: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { chapterId } = await context.params

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

    // Get reason from request body
    const body = await req.json()
    const { reason } = body

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json({ error: 'Reason is required' }, { status: 400 })
    }

    // Update chapter
    const { error: updateError } = await supabase
      .from('chapters')
      .update({
        needs_attention: true,
        attention_reason: reason.trim(),
      })
      .eq('id', chapterId)

    if (updateError) {
      console.error('Error flagging chapter:', updateError)
      return NextResponse.json({ error: 'Failed to flag chapter' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in flag route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// DELETE /api/admin/chapters/[chapterId]/flag - Clear chapter flag
export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const supabase = await createClient()
    const { chapterId } = await context.params

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

    // Update chapter
    const { error: updateError } = await supabase
      .from('chapters')
      .update({
        needs_attention: false,
        attention_reason: null,
      })
      .eq('id', chapterId)

    if (updateError) {
      console.error('Error clearing flag:', updateError)
      return NextResponse.json({ error: 'Failed to clear flag' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in flag route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
