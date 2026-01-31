'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface CreateCommitmentData {
  chapterId: string
  commitmentType: 'stretch_goal' | 'to_member' | 'volunteer_activity' | 'help_favor'
  description: string
  recipientId?: string
  deadline?: string
  madeAtMeeting?: string
}

/**
 * Create a new commitment
 */
export async function createCommitment(data: CreateCommitmentData) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Verify user is a member of this chapter
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('id')
    .eq('chapter_id', data.chapterId)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .single()

  if (!membership) {
    return { success: false, error: 'You are not a member of this chapter' }
  }

  // If commitment is to a member, verify recipient is in the same chapter
  if (data.recipientId) {
    const { data: recipientMembership } = await supabase
      .from('chapter_memberships')
      .select('id')
      .eq('chapter_id', data.chapterId)
      .eq('user_id', data.recipientId)
      .eq('is_active', true)
      .single()

    if (!recipientMembership) {
      return { success: false, error: 'Recipient is not a member of this chapter' }
    }
  }

  const { data: commitment, error } = await supabase
    .from('commitments')
    .insert({
      chapter_id: data.chapterId,
      made_by: user.id,
      made_at_meeting: data.madeAtMeeting || null,
      commitment_type: data.commitmentType,
      description: data.description,
      recipient_id: data.recipientId || null,
      deadline: data.deadline || null,
    })
    .select()
    .single()

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/chapters/${data.chapterId}`)
  revalidatePath('/dashboard')

  return { success: true, commitment }
}

/**
 * Update commitment status (self-reported)
 */
export async function updateCommitmentStatus(
  commitmentId: string,
  status: 'pending' | 'completed' | 'abandoned'
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get the commitment to check if user is the maker
  const { data: commitment } = await supabase
    .from('commitments')
    .select('*, chapters(id)')
    .eq('id', commitmentId)
    .single()

  if (!commitment) {
    return { success: false, error: 'Commitment not found' }
  }

  if (commitment.made_by !== user.id) {
    return { success: false, error: 'You can only update your own commitments' }
  }

  // Update self_reported_status
  const { error } = await supabase
    .from('commitments')
    .update({
      self_reported_status: status,
      // If no recipient, status follows self_reported_status
      status: commitment.recipient_id ? commitment.status : status,
    })
    .eq('id', commitmentId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Check for discrepancy if there's a recipient
  if (commitment.recipient_id && status === 'completed') {
    await checkDiscrepancy(commitmentId)
  }

  revalidatePath(`/chapters/${commitment.chapters.id}`)
  revalidatePath('/dashboard')

  return { success: true }
}

/**
 * Update recipient-reported status (for commitments made to a specific member)
 */
export async function updateRecipientStatus(
  commitmentId: string,
  status: 'pending' | 'completed' | 'abandoned'
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get the commitment to check if user is the recipient
  const { data: commitment } = await supabase
    .from('commitments')
    .select('*, chapters(id)')
    .eq('id', commitmentId)
    .single()

  if (!commitment) {
    return { success: false, error: 'Commitment not found' }
  }

  if (commitment.recipient_id !== user.id) {
    return { success: false, error: 'You can only update status for commitments made to you' }
  }

  // Update recipient_reported_status
  const { error } = await supabase
    .from('commitments')
    .update({
      recipient_reported_status: status,
      // Update overall status based on recipient confirmation
      status: status,
    })
    .eq('id', commitmentId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Check for discrepancy
  await checkDiscrepancy(commitmentId)

  revalidatePath(`/chapters/${commitment.chapters.id}`)
  revalidatePath('/dashboard')

  return { success: true }
}

/**
 * Check for discrepancy between self-reported and recipient-reported status
 */
async function checkDiscrepancy(commitmentId: string) {
  const supabase = await createClient()

  const { data: commitment } = await supabase
    .from('commitments')
    .select('self_reported_status, recipient_reported_status, recipient_id')
    .eq('id', commitmentId)
    .single()

  if (!commitment || !commitment.recipient_id) {
    return
  }

  // Flag discrepancy if:
  // - Self-reported is 'completed' AND recipient-reported is 'pending' or 'abandoned'
  const hasDiscrepancy =
    commitment.self_reported_status === 'completed' &&
    commitment.recipient_reported_status &&
    commitment.recipient_reported_status !== 'completed'

  await supabase
    .from('commitments')
    .update({ discrepancy_flagged: hasDiscrepancy })
    .eq('id', commitmentId)
}

/**
 * Resolve a commitment discrepancy (leader only)
 */
export async function resolveDiscrepancy(
  commitmentId: string,
  finalStatus: 'completed' | 'pending' | 'abandoned'
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get commitment and verify user is a leader
  const { data: commitment } = await supabase
    .from('commitments')
    .select('chapter_id, chapters(id)')
    .eq('id', commitmentId)
    .single()

  if (!commitment) {
    return { success: false, error: 'Commitment not found' }
  }

  const { data: role } = await supabase
    .from('chapter_roles')
    .select('role_type')
    .eq('chapter_id', commitment.chapter_id)
    .eq('user_id', user.id)
    .in('role_type', ['Chapter Leader', 'Backup Leader'])
    .single()

  if (!role) {
    return { success: false, error: 'Only chapter leaders can resolve discrepancies' }
  }

  // Update commitment status and clear discrepancy flag
  const { error } = await supabase
    .from('commitments')
    .update({
      status: finalStatus,
      discrepancy_flagged: false,
    })
    .eq('id', commitmentId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/chapters/${commitment.chapters.id}`)
  revalidatePath('/dashboard')

  return { success: true }
}

/**
 * Complete a commitment with a comment
 */
export async function completeCommitmentWithComment(
  commitmentId: string,
  comment: string
) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get the commitment to check if user is the maker
  const { data: commitment } = await supabase
    .from('commitments')
    .select('*, chapters(id)')
    .eq('id', commitmentId)
    .single()

  if (!commitment) {
    return { success: false, error: 'Commitment not found' }
  }

  if (commitment.made_by !== user.id) {
    return { success: false, error: 'You can only complete your own commitments' }
  }

  // Update commitment with completion
  const { error } = await supabase
    .from('commitments')
    .update({
      self_reported_status: 'completed',
      status: commitment.recipient_id ? commitment.status : 'completed',
      completion_comment: comment,
      completed_at: new Date().toISOString(),
    })
    .eq('id', commitmentId)

  if (error) {
    return { success: false, error: error.message }
  }

  // Check for discrepancy if there's a recipient
  if (commitment.recipient_id) {
    await checkDiscrepancy(commitmentId)
  }

  revalidatePath(`/chapters/${commitment.chapters.id}`)
  revalidatePath('/dashboard')
  revalidatePath('/commitments')

  return { success: true }
}

/**
 * Delete a commitment (maker or leader only)
 */
export async function deleteCommitment(commitmentId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  // Get commitment to check permissions
  const { data: commitment } = await supabase
    .from('commitments')
    .select('made_by, chapter_id, chapters(id)')
    .eq('id', commitmentId)
    .single()

  if (!commitment) {
    return { success: false, error: 'Commitment not found' }
  }

  // Check if user is the maker or a leader
  const isMaker = commitment.made_by === user.id

  if (!isMaker) {
    const { data: role } = await supabase
      .from('chapter_roles')
      .select('role_type')
      .eq('chapter_id', commitment.chapter_id)
      .eq('user_id', user.id)
      .in('role_type', ['Chapter Leader', 'Backup Leader'])
      .single()

    if (!role) {
      return { success: false, error: 'You can only delete your own commitments or must be a chapter leader' }
    }
  }

  const { error } = await supabase
    .from('commitments')
    .delete()
    .eq('id', commitmentId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/chapters/${commitment.chapters.id}`)
  revalidatePath('/dashboard')

  return { success: true }
}
