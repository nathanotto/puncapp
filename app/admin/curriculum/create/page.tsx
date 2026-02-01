import { requireAdmin } from '@/lib/auth/admin'
import AdminLayout from '@/components/layout/AdminLayout'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Input from '@/components/ui/Input'
import { createCurriculumModule } from '@/lib/curriculum/actions'
import { redirect } from 'next/navigation'

export default async function CreateCurriculumPage() {
  const admin = await requireAdmin()

  async function handleCreate(formData: FormData) {
    'use server'
    const result = await createCurriculumModule({
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

  return (
    <AdminLayout admin={admin} currentPage="curriculum">
      <div className="max-w-3xl">
        <Link href="/admin/curriculum" className="text-sm text-blue-600 hover:underline mb-4 inline-block">
          ← Back to Curriculum
        </Link>
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Create Curriculum Module</h2>

        <Card>
          <form action={handleCreate} className="space-y-6">
            <Input
              label="Title"
              name="title"
              required
              placeholder="e.g., Fear of Men"
            />

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Description
              </label>
              <textarea
                name="description"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Brief description of the module..."
                required
              />
            </div>

            <Input
              label="Category"
              name="category"
              required
              placeholder="e.g., fear, addiction, relationship"
            />

            <Input
              label="Order Index"
              name="order_index"
              type="number"
              required
              defaultValue="1"
            />

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                name="punc_managed"
                id="punc_managed"
                className="w-4 h-4"
              />
              <label htmlFor="punc_managed" className="text-sm text-gray-700">
                PUNC Managed (Official curriculum module)
              </label>
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" variant="primary" size="large">
                Create Module
              </Button>
              <Link href="/admin/curriculum">
                <Button type="button" variant="secondary" size="large">
                  Cancel
                </Button>
              </Link>
            </div>
          </form>
        </Card>
      </div>
    </AdminLayout>
  )
}
