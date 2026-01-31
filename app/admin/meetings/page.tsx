import { requireAdmin } from '@/lib/auth/admin'
import AdminLayout from '@/components/layout/AdminLayout'

export default async function AdminMeetingsPage() {
  const admin = await requireAdmin()

  return (
    <AdminLayout admin={admin} currentPage="meetings">
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Meeting Validation Queue</h2>
        <p>Validated meetings awaiting review and export to Direct Outcomes will appear here.</p>
        <p className="text-sm mt-2">Coming in Phase 4</p>
      </div>
    </AdminLayout>
  )
}
