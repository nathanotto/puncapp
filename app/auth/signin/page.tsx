'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import { signIn } from '@/lib/auth/client'

export default function SignInPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { user, error: signInError } = await signIn({
      email: formData.email,
      password: formData.password,
    })

    setLoading(false)

    if (signInError) {
      setError(signInError)
      return
    }

    // Success! Redirect to dashboard
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-warm-cream py-12 px-6">
      <div className="max-w-md mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-earth-brown mb-3">
            Welcome Back
          </h1>
          <p className="text-stone-gray text-lg">
            Sign in to your PUNC account
          </p>
        </div>

        <Card>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="bg-error/10 border border-error text-error px-4 py-3 rounded">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              required
              placeholder="john@example.com"
            />

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
            />

            <Button
              type="submit"
              variant="primary"
              size="large"
              fullWidth
              disabled={loading}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </Button>

            <p className="text-center text-sm text-stone-gray mt-4">
              Don't have an account?{' '}
              <Link href="/auth/signup" className="text-earth-brown font-semibold hover:underline">
                Sign Up
              </Link>
            </p>
          </form>
        </Card>

        <div className="mt-8 text-center">
          <Link href="/admin/login" className="text-xs text-stone-gray hover:text-earth-brown">
            Admin login
          </Link>
        </div>
      </div>
    </div>
  )
}
