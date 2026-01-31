import { requireAdmin } from '@/lib/auth/admin'
import AdminLayout from '@/components/layout/AdminLayout'

export default async function AdminUsersPage() {
  const admin = await requireAdmin()

  return (
    <AdminLayout admin={admin} currentPage="users">
      <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">User Management</h2>
        <p>User list, leader certifications, and user management tools will appear here.</p>
        <p className="text-sm mt-2">Coming in Phase 2</p>
      </div>
    </AdminLayout>
  )
}
