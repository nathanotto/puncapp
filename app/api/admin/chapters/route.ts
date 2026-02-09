import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// POST /api/admin/chapters - Create new chapter
export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()

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
    const {
      name,
      default_location,
      default_meeting_day,
      default_meeting_time,
      meeting_frequency,
      leader_id,
      backup_leader_id,
      member_ids,
    } = body

    // Validation
    if (!name || !default_location || !default_meeting_day || !default_meeting_time || !meeting_frequency || !leader_id) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate leader is certified
    const { data: leaderUser } = await supabase
      .from('users')
      .select('is_leader_certified')
      .eq('id', leader_id)
      .single()

    if (!leaderUser?.is_leader_certified) {
      return NextResponse.json({ error: 'Leader must be certified' }, { status: 400 })
    }

    // Validate backup leader is certified if provided
    if (backup_leader_id) {
      const { data: backupLeaderUser } = await supabase
        .from('users')
        .select('is_leader_certified')
        .eq('id', backup_leader_id)
        .single()

      if (!backupLeaderUser?.is_leader_certified) {
        return NextResponse.json({ error: 'Backup leader must be certified' }, { status: 400 })
      }

      if (leader_id === backup_leader_id) {
        return NextResponse.json({ error: 'Leader and backup leader must be different' }, { status: 400 })
      }
    }

    // Create chapter
    const { data: newChapter, error: chapterError } = await supabase
      .from('chapters')
      .insert({
        name,
        default_location,
        default_meeting_day,
        default_meeting_time,
        meeting_frequency,
        status: 'open',
      })
      .select('id')
      .single()

    if (chapterError || !newChapter) {
      console.error('Error creating chapter:', chapterError)
      return NextResponse.json({ error: 'Failed to create chapter' }, { status: 500 })
    }

    const chapterId = newChapter.id

    // Create memberships array
    const memberships = []

    // Add leader membership
    memberships.push({
      chapter_id: chapterId,
      user_id: leader_id,
      role: 'leader',
      is_active: true,
    })

    // Add backup leader membership if provided
    if (backup_leader_id) {
      memberships.push({
        chapter_id: chapterId,
        user_id: backup_leader_id,
        role: 'backup_leader',
        is_active: true,
      })
    }

    // Add member memberships
    if (member_ids && Array.isArray(member_ids) && member_ids.length > 0) {
      member_ids.forEach(memberId => {
        // Don't add leader or backup leader again as members
        if (memberId !== leader_id && memberId !== backup_leader_id) {
          memberships.push({
            chapter_id: chapterId,
            user_id: memberId,
            role: 'member',
            is_active: true,
          })
        }
      })
    }

    // Insert all memberships
    const { error: membershipError } = await supabase
      .from('chapter_memberships')
      .insert(memberships)

    if (membershipError) {
      console.error('Error creating memberships:', membershipError)
      // Note: Chapter was created but memberships failed
      // You might want to handle this differently in production (e.g., rollback)
      return NextResponse.json({ error: 'Chapter created but failed to add memberships' }, { status: 500 })
    }

    return NextResponse.json({ success: true, chapterId })
  } catch (error) {
    console.error('Error in create chapter route:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
