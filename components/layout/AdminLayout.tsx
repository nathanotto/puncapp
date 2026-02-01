import Link from 'next/link'
import { logout } from '@/lib/auth/actions'

interface AdminLayoutProps {
  children: React.ReactNode
  admin: { name: string; email: string }
  currentPage: 'dashboard' | 'chapters' | 'users' | 'funding' | 'meetings' | 'curriculum'
}

export default function AdminLayout({ children, admin, currentPage }: AdminLayoutProps) {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', href: '/admin', icon: '📊' },
    { id: 'chapters', label: 'Chapters', href: '/admin/chapters', icon: '🏘️' },
    { id: 'users', label: 'Users', href: '/admin/users', icon: '👥' },
    { id: 'curriculum', label: 'Curriculum', href: '/admin/curriculum', icon: '📚' },
    { id: 'funding', label: 'Funding', href: '/admin/funding', icon: '💰' },
    { id: 'meetings', label: 'Meetings', href: '/admin/meetings', icon: '📅' },
  ]

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <h1 className="text-xl font-bold text-gray-900">PUNC Admin</h1>
          <p className="text-xs text-gray-600 mt-1">{admin.name}</p>
        </div>

        <nav className="flex-1 p-4">
          <div className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 text-sm font-medium rounded-md transition-colors ${
                  currentPage === item.id
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                <span className="text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>
        </nav>

        <div className="p-4 border-t border-gray-200 space-y-2">
          <Link
            href="/dashboard"
            className="flex items-center gap-3 px-4 py-3 text-sm text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
          >
            <span className="text-lg">👤</span>
            <span>User Mode</span>
          </Link>
          <form action={logout}>
            <button
              type="submit"
              className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors text-left"
            >
              <span className="text-lg">🚪</span>
              <span>Logout</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="max-w-7xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
