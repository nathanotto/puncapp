import Link from 'next/link'
import { logout } from '@/lib/auth/actions'

interface AdminLayoutProps {
  children: React.ReactNode
  admin: { name: string; email: string }
  currentPage: 'dashboard' | 'chapters' | 'users' | 'funding' | 'meetings'
}

export default function AdminLayout({ children, admin, currentPage }: AdminLayoutProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', href: '/admin' },
    { id: 'chapters', label: 'Chapters', href: '/admin/chapters' },
    { id: 'users', label: 'Users', href: '/admin/users' },
    { id: 'funding', label: 'Funding', href: '/admin/funding' },
    { id: 'meetings', label: 'Meetings', href: '/admin/meetings' },
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PUNC Admin Dashboard</h1>
            <p className="text-sm text-gray-600">Logged in as {admin.name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard"
              className="px-4 py-2 text-sm text-blue-600 hover:text-blue-800 border border-blue-300 rounded-md hover:bg-blue-50 font-medium"
            >
              👤 Switch to User Mode
            </Link>
            <form action={logout}>
              <button
                type="submit"
                className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Logout
              </button>
            </form>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`px-3 py-4 text-sm font-medium border-b-2 ${
                  currentPage === item.id
                    ? 'text-blue-600 border-blue-600'
                    : 'text-gray-600 hover:text-gray-900 border-transparent hover:border-gray-300'
                }`}
              >
                {item.label}
              </Link>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  )
}
