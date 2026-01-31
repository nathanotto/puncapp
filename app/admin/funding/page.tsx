import { requireAdmin } from '@/lib/auth/admin'
import AdminLayout from '@/components/layout/AdminLayout'

export default async function AdminFundingPage() {
  const admin = await requireAdmin()

  return (
    <AdminLayout admin={admin} currentPage="funding">
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Funding Analytics</h2>
        <p>Funding health metrics, chapter funding status, and donor analytics will appear here.</p>
        <p className="text-sm mt-2">Coming in Phase 3</p>
      </div>
    </AdminLayout>
  )
}
