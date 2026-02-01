import { requireAdmin, getAdminClient } from '@/lib/auth/admin'
import AdminLayout from '@/components/layout/AdminLayout'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'

export default async function CurriculumAdminPage() {
  const admin = await requireAdmin()
  const supabase = await getAdminClient()

  // Fetch all curriculum modules
  const { data: modules } = await supabase
    .from('curriculum_modules')
    .select('*')
    .order('order_index')

  return (
    <AdminLayout admin={admin} currentPage="curriculum">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h2 className="text-3xl font-bold text-gray-900">Curriculum Modules</h2>
          <p className="text-gray-600 mt-1">Manage PUNC curriculum content for chapter meetings</p>
        </div>
        <Link href="/admin/curriculum/create">
          <Button variant="primary" size="large">
            Create Module
          </Button>
        </Link>
      </div>

      {modules && modules.length > 0 ? (
        <div className="grid gap-4">
          {modules.map((module: any) => (
            <Card key={module.id} hover>
              <Link href={`/admin/curriculum/${module.id}`}>
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="text-sm font-mono text-gray-500">#{module.order_index}</span>
                      <h3 className="text-lg font-semibold text-gray-900">{module.title}</h3>
                      {module.punc_managed && (
                        <Badge variant="info">PUNC Official</Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">{module.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span>Category: {module.category}</span>
                      <span>•</span>
                      <span>Created {new Date(module.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="ml-4">
                    <Button variant="secondary" size="small">
                      Edit
                    </Button>
                  </div>
                </div>
              </Link>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="text-center py-12">
            <p className="text-gray-600 mb-4">No curriculum modules yet.</p>
            <Link href="/admin/curriculum/create">
              <Button variant="primary">
                Create First Module
              </Button>
            </Link>
          </div>
        </Card>
      )}
    </AdminLayout>
  )
}
