'use client';

import { useState } from 'react';
import { signup } from '@/app/auth/actions';
import Link from 'next/link';

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSignup = async (formData: FormData) => {
    setLoading(true);
    setError(null);

    const result = await signup(formData);

    if (result?.error) {
      setError(result.error);
      setLoading(false);
    }
    // If successful, the server action will redirect
  };

  return (
    <div className="min-h-screen bg-warm-cream flex items-center justify-center px-6">
      <div className="bg-white rounded-lg p-8 max-w-md w-full shadow-lg">
        <h1 className="text-3xl font-bold text-earth-brown mb-2">Sign Up</h1>
        <p className="text-stone-gray mb-6">Create your PUNCapp account</p>

        <form action={handleSignup} className="space-y-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-earth-brown mb-1">
              Full Name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-earth-brown mb-1">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-earth-brown mb-1">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
            />
            <p className="text-xs text-stone-gray mt-1">Must be at least 6 characters</p>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-burnt-orange text-white py-3 rounded-lg font-semibold hover:bg-burnt-orange/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating account...' : 'Sign Up'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-stone-gray">
          Already have an account?{' '}
          <Link href="/auth/login" className="text-burnt-orange font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
