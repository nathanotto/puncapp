'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface CreateModuleData {
  title: string
  description: string
  category: string
  orderIndex: number
  puncManaged: boolean
}

export async function createCurriculumModule(data: CreateModuleData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('curriculum_modules')
    .insert({
      title: data.title,
      description: data.description,
      category: data.category,
      order_index: data.orderIndex,
      punc_managed: data.puncManaged,
      exercises: {},
      assignments: {},
      commitment_prompts: {},
    })

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/curriculum')
  return { success: true }
}

export async function updateCurriculumModule(id: string, data: CreateModuleData) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('curriculum_modules')
    .update({
      title: data.title,
      description: data.description,
      category: data.category,
      order_index: data.orderIndex,
      punc_managed: data.puncManaged,
    })
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/curriculum')
  revalidatePath(`/admin/curriculum/${id}`)
  return { success: true }
}

export async function deleteCurriculumModule(id: string) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('curriculum_modules')
    .delete()
    .eq('id', id)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/admin/curriculum')
  return { success: true }
}
