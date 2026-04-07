'use client'

import { signIn } from 'next-auth/react'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const result = await signIn('credentials', {
      redirect: false,
      email,
      password,
    })

    if (result?.error) {
      setError('Invalid email or password')
      setLoading(false)
    } else {
      // Use window.location for a full redirect
      window.location.href = '/'
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0a0a0a' }}>
      <div className="max-w-md w-full p-8 rounded-lg border" style={{ backgroundColor: '#111', borderColor: '#2a2a2a' }}>
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold" style={{ color: '#00f0ff', textShadow: '0 0 10px #00f0ff' }}>
            Kortex CRM
          </h1>
          <p className="mt-2" style={{ color: '#9ca3af' }}>
            Sign in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-3 rounded-md text-sm" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid #ef4444' }}>
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium" style={{ color: '#d1d5db' }}>
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full px-3 py-2 rounded-md border outline-none transition-all"
              style={{ 
                borderColor: '#2a2a2a',
                color: '#fff'
              }}
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium" style={{ color: '#d1d5db' }}>
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 rounded-md border outline-none transition-all"
              style={{ 
                backgroundColor: '#1a1a1a', 
                borderColor: '#2a2a2a', 
                color: '#fff',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2 px-4 rounded-md font-medium transition-all disabled:opacity-50"
            style={{ 
              backgroundColor: '#00f0ff', 
              color: '#000',
              boxShadow: '0 0 10px rgba(0, 240, 255, 0.3)'
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}