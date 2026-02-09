'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'

interface SidebarProps {
  userName: string
  chapterId?: string
  chapterName?: string
  isAdmin?: boolean
}

export function Sidebar({ userName, chapterId, chapterName, isAdmin }: SidebarProps) {
  const pathname = usePathname()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { name: 'Home', href: '/', icon: '🏠' },
    { name: 'Meetings', href: chapterId ? `/chapters/${chapterId}/meetings` : '/dashboard', icon: '📅' },
    { name: 'Men', href: chapterId ? `/chapters/${chapterId}/men` : '#', icon: '👥' },
    { name: 'Commitments', href: chapterId ? `/chapters/${chapterId}/commitments` : '#', icon: '🎯' },
    { name: 'Curriculum', href: chapterId ? `/chapters/${chapterId}/curriculum` : '#', icon: '📚' },
  ]

  const closeMobileMenu = () => setMobileMenuOpen(false)

  return (
    <>
      {/* Mobile Hamburger Button - Fixed at top left */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50 bg-deep-charcoal text-warm-cream p-3 rounded-lg shadow-lg hover:bg-deep-charcoal/90 transition-colors"
        aria-label="Toggle menu"
      >
        {mobileMenuOpen ? (
          // X icon when open
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          // Hamburger icon when closed
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <div
        className={`
          fixed lg:static
          top-0 left-0
          w-64 bg-deep-charcoal text-warm-cream
          flex flex-col min-h-screen
          z-40
          transition-transform duration-300 ease-in-out
          ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* User info at top */}
        <div className="p-6 border-b border-warm-cream/20">
          <div className="mb-4 mt-12 lg:mt-0 relative">
            <p className="text-xl font-bold mb-1">{userName}</p>
            {chapterName && (
              <p className="text-sm text-warm-cream/70">{chapterName}</p>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className="absolute top-0 right-0 text-xs text-warm-cream/60 hover:text-warm-cream transition-colors"
                onClick={closeMobileMenu}
              >
                Go to admin →
              </Link>
            )}
          </div>
          <Link
            href="/auth/logout"
            className="text-sm text-warm-cream/60 hover:text-warm-cream"
            onClick={closeMobileMenu}
          >
            Sign Out →
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname.startsWith(item.href) && item.href !== '#'

              return (
                <li key={item.name}>
                  <Link
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                      isActive
                        ? 'bg-sage-green text-deep-charcoal font-semibold'
                        : 'text-warm-cream hover:bg-warm-cream/10'
                    }`}
                    onClick={closeMobileMenu}
                  >
                    <span className="text-xl">{item.icon}</span>
                    <span>{item.name}</span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>
      </div>
    </>
  )
}
