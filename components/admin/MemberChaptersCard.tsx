'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Membership {
  id: string
  role: string
  chapters: {
    id: string
    name: string
    status: string
  }
}

interface Chapter {
  id: string
  name: string
  status: string
}

interface MemberChaptersCardProps {
  memberId: string
  memberships: Membership[]
  availableChapters: Chapter[]
}

export default function MemberChaptersCard({
  memberId,
  memberships,
  availableChapters,
}: MemberChaptersCardProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [newChapterId, setNewChapterId] = useState('')
  const [newRole, setNewRole] = useState('member')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleAddMembership = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!newChapterId) {
      setError('Please select a chapter')
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/members/${memberId}/chapters`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId: newChapterId,
          role: newRole,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to add membership')
      }

      setIsAdding(false)
      setNewChapterId('')
      setNewRole('member')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add membership')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleChangeRole = async (membershipId: string, newRole: string) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/memberships/${membershipId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change role')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRemoveMembership = async (membershipId: string, chapterName: string) => {
    if (!confirm(`Remove member from ${chapterName}?`)) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/memberships/${membershipId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove membership')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove membership')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Filter out chapters the member is already in
  const memberChapterIds = new Set(memberships.map(m => m.chapters.id))
  const chaptersToAdd = availableChapters.filter(c => !memberChapterIds.has(c.id))

  const roleColors = {
    leader: 'bg-burnt-orange text-white',
    backup_leader: 'bg-orange-100 text-orange-800',
    member: 'bg-stone-100 text-stone-700',
  }

  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-xl font-bold text-earth-brown mb-4">Chapter Memberships</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Current Memberships */}
      {memberships.length > 0 ? (
        <table className="w-full mb-6">
          <thead>
            <tr className="border-b border-stone-200">
              <th className="text-left py-2 text-sm font-semibold text-stone-700">Chapter</th>
              <th className="text-left py-2 text-sm font-semibold text-stone-700">Role</th>
              <th className="text-right py-2 text-sm font-semibold text-stone-700">Action</th>
            </tr>
          </thead>
          <tbody>
            {memberships.map(membership => {
              const roleColor = roleColors[membership.role as keyof typeof roleColors] || roleColors.member
              return (
                <tr key={membership.id} className="border-b border-stone-100">
                  <td className="py-3">
                    <Link
                      href={`/admin/chapters/${membership.chapters.id}`}
                      className="text-burnt-orange hover:underline"
                    >
                      {membership.chapters.name}
                    </Link>
                  </td>
                  <td className="py-3">
                    <select
                      value={membership.role}
                      onChange={(e) => handleChangeRole(membership.id, e.target.value)}
                      disabled={isSubmitting}
                      className={`px-2 py-1 rounded text-xs font-medium border-0 ${roleColor} disabled:opacity-50`}
                    >
                      <option value="member">member</option>
                      <option value="backup_leader">backup leader</option>
                      <option value="leader">leader</option>
                    </select>
                  </td>
                  <td className="py-3 text-right">
                    <button
                      onClick={() => handleRemoveMembership(membership.id, membership.chapters.name)}
                      disabled={isSubmitting}
                      className="text-red-600 hover:underline text-sm disabled:opacity-50"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      ) : (
        <p className="text-stone-gray mb-6">Not a member of any chapters</p>
      )}

      {/* Add to Chapter */}
      {isAdding ? (
        <form onSubmit={handleAddMembership} className="border-t border-stone-200 pt-4">
          <h3 className="font-semibold text-earth-brown mb-3">Add to Chapter</h3>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Chapter
              </label>
              <select
                value={newChapterId}
                onChange={(e) => setNewChapterId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
              >
                <option value="">Select chapter...</option>
                {chaptersToAdd.map(chapter => (
                  <option key={chapter.id} value={chapter.id}>
                    {chapter.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Role
              </label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value)}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
              >
                <option value="member">Member</option>
                <option value="backup_leader">Backup Leader</option>
                <option value="leader">Leader</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 bg-burnt-orange text-white rounded-lg hover:bg-deep-charcoal transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Adding...' : 'Add'}
            </button>
            <button
              type="button"
              onClick={() => {
                setIsAdding(false)
                setNewChapterId('')
                setNewRole('member')
                setError(null)
              }}
              className="px-4 py-2 bg-stone-200 text-earth-brown rounded-lg hover:bg-stone-300 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => setIsAdding(true)}
          disabled={chaptersToAdd.length === 0}
          className="text-burnt-orange hover:underline text-sm disabled:text-stone-400 disabled:no-underline"
        >
          {chaptersToAdd.length === 0 ? 'No chapters available' : '+ Add to Chapter'}
        </button>
      )}
    </div>
  )
}
