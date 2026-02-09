'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface User {
  id: string
  name: string
  username: string | null
  email: string
  address?: string | null
}

interface CreateChapterFormProps {
  certifiedLeaders: User[]
  unassignedUsers: User[]
}

export default function CreateChapterForm({
  certifiedLeaders,
  unassignedUsers,
}: CreateChapterFormProps) {
  const [formData, setFormData] = useState({
    name: '',
    default_location: '',
    default_meeting_day: 'Thursday',
    default_meeting_time: '19:00',
    meeting_frequency: 'weekly',
    leader_id: '',
    backup_leader_id: '',
    member_ids: [] as string[],
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleMemberToggle = (userId: string) => {
    setFormData(prev => ({
      ...prev,
      member_ids: prev.member_ids.includes(userId)
        ? prev.member_ids.filter(id => id !== userId)
        : [...prev.member_ids, userId],
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    // Validation
    if (!formData.name.trim()) {
      setError('Chapter name is required')
      setIsSubmitting(false)
      return
    }

    if (!formData.default_location.trim()) {
      setError('Meeting location is required')
      setIsSubmitting(false)
      return
    }

    if (!formData.leader_id) {
      setError('Chapter leader is required')
      setIsSubmitting(false)
      return
    }

    // Check if leader and backup leader are the same
    if (formData.backup_leader_id && formData.leader_id === formData.backup_leader_id) {
      setError('Leader and backup leader must be different people')
      setIsSubmitting(false)
      return
    }

    try {
      const response = await fetch('/api/admin/chapters', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create chapter')
      }

      // Success - redirect to chapter detail page
      router.push(`/admin/chapters/${data.chapterId}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create chapter')
      setIsSubmitting(false)
    }
  }

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
  const frequencies = [
    { value: 'weekly', label: 'Weekly' },
    { value: 'biweekly', label: 'Biweekly (every 2 weeks)' },
    { value: 'monthly', label: 'Monthly' },
  ]

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-800 font-medium">{error}</p>
        </div>
      )}

      {/* Chapter Details */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-earth-brown mb-4">Chapter Details</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Chapter Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Bay Area Chapter"
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Default Meeting Location *
            </label>
            <input
              type="text"
              value={formData.default_location}
              onChange={(e) => setFormData({ ...formData, default_location: e.target.value })}
              placeholder="e.g., Community Center, 123 Main St"
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Meeting Day *
              </label>
              <select
                value={formData.default_meeting_day}
                onChange={(e) => setFormData({ ...formData, default_meeting_day: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
              >
                {days.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-700 mb-1">
                Meeting Time *
              </label>
              <input
                type="time"
                value={formData.default_meeting_time}
                onChange={(e) => setFormData({ ...formData, default_meeting_time: e.target.value })}
                className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Meeting Frequency *
            </label>
            <select
              value={formData.meeting_frequency}
              onChange={(e) => setFormData({ ...formData, meeting_frequency: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
            >
              {frequencies.map(freq => (
                <option key={freq.value} value={freq.value}>{freq.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Leadership */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-earth-brown mb-4">Leadership</h2>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Chapter Leader *
            </label>
            <select
              value={formData.leader_id}
              onChange={(e) => setFormData({ ...formData, leader_id: e.target.value })}
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
            >
              <option value="">Select a certified leader...</option>
              {certifiedLeaders.map(leader => (
                <option key={leader.id} value={leader.id}>
                  {leader.name} ({leader.email})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Backup Leader (optional)
            </label>
            <select
              value={formData.backup_leader_id}
              onChange={(e) => setFormData({ ...formData, backup_leader_id: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
            >
              <option value="">None</option>
              {certifiedLeaders.map(leader => (
                <option key={leader.id} value={leader.id}>
                  {leader.name} ({leader.email})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Initial Members */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-earth-brown mb-4">
          Initial Members ({formData.member_ids.length} selected)
        </h2>

        {unassignedUsers.length > 0 ? (
          <div className="border border-stone-200 rounded-lg p-4 max-h-96 overflow-y-auto">
            <div className="space-y-2">
              {unassignedUsers.map(user => (
                <label
                  key={user.id}
                  className="flex items-start gap-3 p-2 hover:bg-stone-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={formData.member_ids.includes(user.id)}
                    onChange={() => handleMemberToggle(user.id)}
                    className="mt-1 w-4 h-4 text-burnt-orange focus:ring-burnt-orange rounded"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-stone-700">
                      {user.name}
                      {user.username && <span className="text-stone-500 ml-1">@{user.username}</span>}
                    </div>
                    <div className="text-sm text-stone-600">{user.email}</div>
                    {user.address && (
                      <div className="text-xs text-stone-500">{user.address}</div>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-stone-50 border border-stone-200 rounded-lg p-4 text-center">
            <p className="text-stone-600">No unassigned members available</p>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4 border-t border-stone-200">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 bg-stone-200 text-earth-brown rounded-lg hover:bg-stone-300 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || certifiedLeaders.length === 0}
          className="px-6 py-2 bg-burnt-orange text-white rounded-lg hover:bg-deep-charcoal transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed"
        >
          {isSubmitting ? 'Creating Chapter...' : 'Create Chapter'}
        </button>
      </div>
    </form>
  )
}
