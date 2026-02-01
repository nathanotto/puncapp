import { requireAdmin, getAdminClient } from '@/lib/auth/admin'
import AdminLayout from '@/components/layout/AdminLayout'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { updateCurriculumModule, deleteCurriculumModule } from '@/lib/curriculum/actions'
import { redirect, notFound } from 'next/navigation'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditCurriculumPage({ params }: PageProps) {
  const { id } = await params
  const admin = await requireAdmin()
  const supabase = await getAdminClient()

  const { data: module } = await supabase
    .from('curriculum_modules')
    .select('*')
    .eq('id', id)
    .single()

  if (!module) {
    notFound()
  }

  async function handleUpdate(formData: FormData) {
    'use server'
    const result = await updateCurriculumModule(id, {
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      category: formData.get('category') as string,
      orderIndex: parseInt(formData.get('order_index') as string),
      puncManaged: formData.get('punc_managed') === 'on',
    })

    if (result.success) {
      redirect('/admin/curriculum')
    }
  }

  async function handleDelete() {
    'use server'
    const result = await deleteCurriculumModule(id)
    if (result.success) {
      redirect('/admin/curriculum')
    }
  }

  return (
    <AdminLayout admin={admin} currentPage="curriculum">
      <div className="max-w-3xl">
        <Link href="/admin/curriculum" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
          ← Back to Curriculum
        </Link>
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Edit Curriculum Module</h2>

        <Card>
          <form action={handleUpdate} className="space-y-6">
            <Input
              label="Title"
              name="title"
              required
              defaultValue={module.title}
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                defaultValue={module.description}
                required
              />
            </div>

            <Input
              label="Category"
              name="category"
              required
              defaultValue={module.category}
            />

            <Input
              label="Order Index"
              name="order_index"
              type="number"
              required
              defaultValue={module.order_index}
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="punc_managed"
                id="punc_managed"
                className="w-4 h-4"
                defaultChecked={module.punc_managed}
              />
              <label htmlFor="punc_managed" className="text-sm text-gray-700">
                PUNC Managed (Official curriculum module)
              </label>
            </div>

            <div className="flex justify-between pt-4 border-t">
              <div className="flex gap-3">
                <Button type="submit" variant="primary" size="large">
                  Save Changes
                </Button>
                <Link href="/admin/curriculum">
                  <Button type="button" variant="secondary" size="large">
                    Cancel
                  </Button>
                </Link>
              </div>
              <form action={handleDelete}>
                <Button type="submit" variant="secondary" size="large">
                  Delete Module
                </Button>
              </form>
            </div>
          </form>
        </Card>
      </div>
    </AdminLayout>
  )
}
