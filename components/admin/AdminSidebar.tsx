'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminSidebarProps {
  userName: string;
}

interface NavItem {
  label: string;
  icon: string;
  href: string;
  disabled?: boolean;
  comingSoon?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

export function AdminSidebar({ userName }: AdminSidebarProps) {
  const pathname = usePathname();

  const navSections: NavSection[] = [
    {
      title: 'Overview',
      items: [
        { label: 'Dashboard', icon: '📊', href: '/admin' },
      ],
    },
    {
      title: 'Management',
      items: [
        { label: 'Chapters', icon: '🏛️', href: '/admin/chapters' },
        { label: 'Members', icon: '👥', href: '/admin/members' },
        { label: 'Curriculum', icon: '📚', href: '/admin/curriculum' },
      ],
    },
    {
      title: 'Review',
      items: [
        { label: 'Meeting Validation', icon: '✅', href: '/admin/validation' },
        { label: 'Chapter Flags', icon: '🚩', href: '/admin/flags' },
      ],
    },
    {
      title: 'Actions',
      items: [
        { label: 'Admin Work', icon: '⚙️', href: '/admin/work' },
      ],
    },
  ];

  function isActive(href: string): boolean {
    if (href === '/admin') {
      return pathname === '/admin';
    }
    return pathname.startsWith(href);
  }

  return (
    <div className="w-64 bg-orange-100 text-gray-800 min-h-screen flex flex-col border-r border-orange-200">
      {/* Header */}
      <div className="p-6 border-b border-orange-200 relative">
        <Link
          href="/"
          className="absolute top-4 right-4 text-[10px] text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
        >
          <span>←</span>
          <span>Back to App</span>
        </Link>
        <h1 className="font-medium mb-1 text-orange-800" style={{ fontSize: '20px' }}>Punc Admin</h1>
        <p className="text-xs text-gray-600">{userName}</p>
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 p-4 space-y-6">
        {navSections.map((section) => (
          <div key={section.title}>
            <h2 className="tracking-wide text-gray-500 font-medium mb-2 px-3" style={{ fontSize: '20px' }}>
              {section.title}
            </h2>
            <ul className="space-y-1">
              {section.items.map((item) => {
                const active = isActive(item.href);
                const linkClasses = `
                  flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                  ${active ? 'bg-orange-300 text-orange-900 font-semibold' : ''}
                  ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-orange-200/50'}
                `;

                if (item.disabled) {
                  return (
                    <li key={item.label}>
                      <div
                        className={linkClasses}
                        title={item.comingSoon ? 'Coming soon' : undefined}
                      >
                        <span className="text-lg">{item.icon}</span>
                        <span className="text-sm">{item.label}</span>
                        {item.comingSoon && (
                          <span className="ml-auto text-[10px] text-gray-400">Soon</span>
                        )}
                      </div>
                    </li>
                  );
                }

                return (
                  <li key={item.label}>
                    <Link href={item.href} className={linkClasses}>
                      <span className="text-lg">{item.icon}</span>
                      <span className="text-sm">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>
    </div>
  );
}
