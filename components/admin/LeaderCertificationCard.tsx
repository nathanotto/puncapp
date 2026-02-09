'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface LeaderCertificationCardProps {
  memberId: string
  isCertified: boolean
  certifiedAt: string | null
  expiresAt: string | null
}

export default function LeaderCertificationCard({
  memberId,
  isCertified,
  certifiedAt,
  expiresAt,
}: LeaderCertificationCardProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleCertify = async () => {
    if (!confirm('Certify this member as a leader? This will grant them leader privileges.')) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/members/${memberId}/certify`, {
        method: 'POST',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to certify member')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to certify member')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRevoke = async () => {
    if (!confirm('Revoke leader certification? This member will no longer have leader privileges.')) {
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/members/${memberId}/certify`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to revoke certification')
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke certification')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Check if expiring soon (within 30 days)
  const isExpiringSoon = expiresAt && new Date(expiresAt) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  return (
    <div className="bg-white rounded-lg p-6">
      <h2 className="text-xl font-bold text-earth-brown mb-4">Leader Certification</h2>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {isCertified ? (
        <div>
          <div className={`border-2 rounded-lg p-4 mb-4 ${isExpiringSoon ? 'bg-yellow-50 border-yellow-300' : 'bg-green-50 border-green-300'}`}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className={`font-bold mb-1 ${isExpiringSoon ? 'text-yellow-900' : 'text-green-900'}`}>
                  {isExpiringSoon ? '⚠️ Certification Expiring Soon' : '✓ Certified Leader'}
                </h3>
                <div className="space-y-1 text-sm">
                  {certifiedAt && (
                    <p className={isExpiringSoon ? 'text-yellow-800' : 'text-green-800'}>
                      <span className="font-medium">Certified:</span>{' '}
                      {new Date(certifiedAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                  {expiresAt && (
                    <p className={isExpiringSoon ? 'text-yellow-800' : 'text-green-800'}>
                      <span className="font-medium">Expires:</span>{' '}
                      {new Date(expiresAt).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <button
            onClick={handleRevoke}
            disabled={isSubmitting}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Revoking...' : 'Revoke Certification'}
          </button>
        </div>
      ) : (
        <div>
          <p className="text-stone-gray mb-4">This member is not currently certified as a leader.</p>
          <button
            onClick={handleCertify}
            disabled={isSubmitting}
            className="px-4 py-2 bg-burnt-orange text-white rounded-lg hover:bg-deep-charcoal transition-colors disabled:bg-stone-300 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Certifying...' : 'Certify as Leader'}
          </button>
        </div>
      )}
    </div>
  )
}
