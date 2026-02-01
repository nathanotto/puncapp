'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function postChapterUpdate(chapterId: string, message: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, error: 'Not authenticated' }
  }

  const { error } = await supabase
    .from('chapter_updates')
    .insert({
      chapter_id: chapterId,
      user_id: user.id,
      message: message,
    })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath(`/chapters/${chapterId}`)
  return { success: true }
}
