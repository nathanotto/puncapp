'use client'

import { useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'

interface User {
  id: string
  name: string
  username: string | null
  email: string
  participation_score: number | null
  is_leader_certified: boolean
  memberships: Array<{
    role: string
    chapters: {
      id: string
      name: string
    }
  }>
  isAssigned: boolean
  isLeader: boolean
}

interface MembersTableProps {
  users: User[]
  currentSearch: string
}

export default function MembersTable({ users, currentSearch }: MembersTableProps) {
  const [searchValue, setSearchValue] = useState(currentSearch)
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams(searchParams.toString())
    if (searchValue) {
      params.set('search', searchValue)
    } else {
      params.delete('search')
    }
    router.push(`/admin/members?${params.toString()}`)
  }

  const roleColors = {
    leader: 'bg-burnt-orange text-white',
    backup_leader: 'bg-orange-100 text-orange-800',
    member: 'bg-stone-100 text-stone-700',
  }

  return (
    <div className="bg-white rounded-lg p-6">
      {/* Search Box */}
      <form onSubmit={handleSearch} className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search by name, username, or email..."
            className="flex-1 px-4 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
          />
          <button
            type="submit"
            className="px-6 py-2 bg-burnt-orange text-white rounded-lg hover:bg-deep-charcoal transition-colors"
          >
            Search
          </button>
          {currentSearch && (
            <button
              type="button"
              onClick={() => {
                setSearchValue('')
                const params = new URLSearchParams(searchParams.toString())
                params.delete('search')
                router.push(`/admin/members?${params.toString()}`)
              }}
              className="px-4 py-2 bg-stone-200 text-earth-brown rounded-lg hover:bg-stone-300 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </form>

      {/* Table */}
      {users.length > 0 ? (
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-200">
              <th className="text-left py-3 text-sm font-semibold text-stone-700">Name</th>
              <th className="text-left py-3 text-sm font-semibold text-stone-700">Email</th>
              <th className="text-left py-3 text-sm font-semibold text-stone-700">Chapter(s)</th>
              <th className="text-center py-3 text-sm font-semibold text-stone-700">Participation</th>
              <th className="text-center py-3 text-sm font-semibold text-stone-700">Certified</th>
              <th className="text-right py-3 text-sm font-semibold text-stone-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id} className="border-b border-stone-100">
                <td className="py-3 text-sm">
                  {user.name}
                  {user.username && <span className="text-stone-500 ml-1">@{user.username}</span>}
                </td>
                <td className="py-3 text-sm text-stone-600">{user.email}</td>
                <td className="py-3">
                  {user.memberships.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {user.memberships.map((membership, idx) => {
                        const roleColor = roleColors[membership.role as keyof typeof roleColors] || roleColors.member
                        return (
                          <Link
                            key={idx}
                            href={`/admin/chapters/${membership.chapters.id}`}
                            className="inline-flex items-center gap-1 hover:underline"
                          >
                            <span className="text-sm text-burnt-orange">{membership.chapters.name}</span>
                            <span className={`px-2 py-0.5 rounded text-xs font-medium ${roleColor}`}>
                              {membership.role.replace('_', ' ')}
                            </span>
                          </Link>
                        )
                      })}
                    </div>
                  ) : (
                    <span className="text-sm text-stone-400 italic">Unassigned</span>
                  )}
                </td>
                <td className="py-3 text-sm text-center">{user.participation_score || 0} pts</td>
                <td className="py-3 text-center">
                  {user.is_leader_certified ? (
                    <span className="text-green-600 font-medium">✓</span>
                  ) : (
                    <span className="text-stone-300">—</span>
                  )}
                </td>
                <td className="py-3 text-right">
                  <Link
                    href={`/admin/members/${user.id}`}
                    className="text-burnt-orange hover:underline text-sm"
                  >
                    View →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <div className="text-center py-8">
          <p className="text-stone-gray">
            {currentSearch ? 'No members found matching your search.' : 'No members found.'}
          </p>
        </div>
      )}
    </div>
  )
}
