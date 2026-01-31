'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import Button from '@/components/ui/Button'
import Input from '@/components/ui/Input'
import Card from '@/components/ui/Card'
import { signUp } from '@/lib/auth/client'

export default function SignUpPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    name: '',
    phone: '',
    address: '',
    username: '',
    displayPreference: 'real_name' as 'real_name' | 'username',
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    if (formData.username.length < 2) {
      setError('Username must be at least 2 characters')
      return
    }

    setLoading(true)

    const { user, error: signUpError } = await signUp({
      email: formData.email,
      password: formData.password,
      name: formData.name,
      phone: formData.phone,
      address: formData.address,
      username: formData.username,
      displayPreference: formData.displayPreference,
    })

    setLoading(false)

    if (signUpError) {
      setError(signUpError)
      return
    }

    // Success! Redirect to dashboard
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-warm-cream py-12 px-6">
      <div className="max-w-lg mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-earth-brown mb-3">
            Join PUNC
          </h1>
          <p className="text-stone-gray text-lg">
            Find your brotherhood. Start your journey.
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
              label="Full Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              required
              placeholder="John Doe"
            />

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
              label="Phone"
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              required
              placeholder="555-0123"
            />

            <Input
              label="Address"
              type="text"
              name="address"
              value={formData.address}
              onChange={handleChange}
              required
              placeholder="123 Main St, Austin, TX 78701"
              helperText="Used to find chapters near you"
            />

            <Input
              label="Username"
              type="text"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
              placeholder="johnd"
              helperText="Your nickname for the community"
            />

            <div className="w-full">
              <label className="block text-sm font-semibold text-deep-charcoal mb-1.5">
                Display Preference
              </label>
              <select
                name="displayPreference"
                value={formData.displayPreference}
                onChange={handleChange}
                className="w-full bg-white border-2 border-border-light rounded px-4 py-3 text-base focus:outline-none focus:border-earth-brown focus:ring-1 focus:ring-earth-brown"
              >
                <option value="real_name">Show my real name</option>
                <option value="username">Show my username</option>
              </select>
              <p className="mt-1.5 text-sm text-stone-gray">
                How you want to appear to other members
              </p>
            </div>

            <Input
              label="Password"
              type="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
              placeholder="••••••••"
              helperText="At least 6 characters"
            />

            <Input
              label="Confirm Password"
              type="password"
              name="confirmPassword"
              value={formData.confirmPassword}
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
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>

            <p className="text-center text-sm text-stone-gray mt-4">
              Already have an account?{' '}
              <Link href="/auth/signin" className="text-earth-brown font-semibold hover:underline">
                Sign In
              </Link>
            </p>
          </form>
        </Card>
      </div>
    </div>
  )
}
