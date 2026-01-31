'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState } from 'react'
import { logout } from '@/lib/auth/actions'

interface NavItem {
  label: string
  href: string
  icon?: string
}

const navItems: NavItem[] = [
  { label: 'Home', href: '/dashboard', icon: '⛺' },
  { label: 'Meetings', href: '/meetings', icon: '📅' },
  { label: 'Commitments', href: '/commitments', icon: '✓' },
  { label: 'Profile', href: '/profile', icon: '👤' },
]

export default function SideNav() {
  const pathname = usePathname()
  const [isOpen, setIsOpen] = useState(false)

  const toggleMenu = () => setIsOpen(!isOpen)
  const closeMenu = () => setIsOpen(false)

  return (
    <>
      {/* Mobile hamburger button */}
      <button
        onClick={toggleMenu}
        className="md:hidden fixed top-4 left-4 z-50 bg-deep-charcoal text-warm-cream p-3 rounded-md shadow-lg"
        aria-label="Toggle menu"
      >
        {isOpen ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        )}
      </button>

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={closeMenu}
        />
      )}

      {/* Side navigation */}
      <nav className={`
        fixed md:static
        inset-y-0 left-0
        w-56 bg-deep-charcoal text-warm-cream
        p-6 z-40
        transform transition-transform duration-300 ease-in-out
        md:transform-none
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        flex flex-col
      `}>
        <div className="mb-8">
          <Link href="/dashboard" onClick={closeMenu}>
            <h2 className="text-xl font-bold hover:text-burnt-orange transition-colors cursor-pointer">PUNC</h2>
          </Link>
        </div>
        <ul className="space-y-2 flex-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={closeMenu}
                  className={`flex items-center gap-3 px-4 py-2 rounded-md transition-colors ${
                    isActive
                      ? 'bg-burnt-orange text-white font-semibold'
                      : 'text-warm-cream/80 hover:bg-warm-cream/10 hover:text-warm-cream'
                  }`}
                >
                  {item.icon && <span className="text-lg">{item.icon}</span>}
                  <span>{item.label}</span>
                </Link>
              </li>
            )
          })}
        </ul>

        {/* Logout at bottom */}
        <div className="mt-auto pt-4 border-t border-warm-cream/20">
          <form action={logout}>
            <button
              type="submit"
              className="flex items-center gap-3 px-4 py-2 rounded-md transition-colors text-warm-cream/80 hover:bg-warm-cream/10 hover:text-warm-cream w-full text-left"
            >
              <span className="text-lg">🚪</span>
              <span>Logout</span>
            </button>
          </form>
        </div>
      </nav>
    </>
  )
}
