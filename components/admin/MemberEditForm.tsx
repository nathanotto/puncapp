'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Member {
  id: string
  name: string
  username: string | null
  email: string
  phone: string | null
  address: string | null
  is_tester: boolean
  is_punc_admin: boolean
}

interface MemberEditFormProps {
  member: Member
}

export default function MemberEditForm({ member }: MemberEditFormProps) {
  const [formData, setFormData] = useState({
    name: member.name,
    username: member.username || '',
    email: member.email,
    phone: member.phone || '',
    address: member.address || '',
    is_tester: member.is_tester ?? false,
    is_punc_admin: member.is_punc_admin ?? false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch(`/api/admin/members/${member.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          username: formData.username || null,
          email: formData.email,
          phone: formData.phone || null,
          address: formData.address || null,
          is_tester: formData.is_tester,
          is_punc_admin: formData.is_punc_admin,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update member')
      }

      setSuccess(true)
      router.refresh()
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update member')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-xl font-bold text-earth-brown mb-4">Basic Information</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <p className="text-green-800 text-sm">Member updated successfully</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Email *
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Phone
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">
            Address
          </label>
          <textarea
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            rows={2}
            className="w-full px-3 py-2 border border-stone-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-burnt-orange"
          />
        </div>

        <div className="flex gap-4 pt-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_tester}
              onChange={(e) => setFormData({ ...formData, is_tester: e.target.checked })}
              className="w-4 h-4 text-burnt-orange focus:ring-burnt-orange rounded"
            />
            <span className="text-sm text-stone-700">Tester Mode</span>
          </label>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.is_punc_admin}
              onChange={(e) => setFormData({ ...formData, is_punc_admin: e.target.checked })}
              className="w-4 h-4 text-burnt-orange focus:ring-burnt-orange rounded"
            />
            <span className="text-sm text-stone-700">PUNC Admin</span>
          </label>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-6 py-2 bg-burnt-orange text-white rounded-lg hover:bg-deep-charcoal transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </form>
    </div>
  )
}
