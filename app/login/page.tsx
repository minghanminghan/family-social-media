'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendOtp, verifyOtp } from '@/lib/actions'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const router = useRouter()

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await sendOtp(email)

    if (result.error) {
      setError(result.error)
    } else {
      setSent(true)
    }
    setLoading(false)
  }

  async function handleVerifyOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await verifyOtp(email, otp)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold">Enter code</h1>
            <p className="text-sm text-gray-500">
              We sent a code to <span className="font-medium text-gray-900">{email}. Please check your spam if you don't see it in your inbox.</span>
            </p>
          </div>
          <form onSubmit={handleVerifyOtp} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="6-digit code"
              value={otp}
              onChange={e => setOtp(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
          </form>
          <button
            onClick={() => { setSent(false); setOtp(''); setError(null) }}
            className="w-full text-sm text-gray-500 underline"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold text-center">Family</h1>
        <form onSubmit={handleSendOtp} className="space-y-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            required
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Sending code…' : 'Send sign-in code'}
          </button>
        </form>
      </div>
    </div>
  )
}
