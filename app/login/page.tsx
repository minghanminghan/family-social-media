'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendOtp, verifyOtp, signInWithPassword, requestPasswordReset, confirmPasswordReset } from '@/lib/actions'

type Mode = 'password' | 'otp' | 'reset'

export default function LoginPage() {
  const [mode, setMode] = useState<Mode>('password')

  if (mode === 'otp') return <OtpLogin onBack={() => setMode('password')} />
  if (mode === 'reset') return <ResetPassword onBack={() => setMode('password')} />
  return <PasswordLogin onUseOtp={() => setMode('otp')} onForgotPassword={() => setMode('reset')} />
}

function PasswordLogin({ onUseOtp, onForgotPassword }: { onUseOtp: () => void; onForgotPassword: () => void }) {
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await signInWithPassword(identifier, password)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      router.push('/')
      router.refresh()
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <h1 className="text-2xl font-semibold text-center">Family</h1>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="text"
            placeholder="Email or username"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            required
            autoComplete="username"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            autoComplete="current-password"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <div className="flex items-center justify-between text-sm">
          <button onClick={onForgotPassword} className="text-gray-500 underline">
            Forgot password?
          </button>
          <button onClick={onUseOtp} className="text-gray-500 underline">
            Sign Up / Use email OTP
          </button>
        </div>
      </div>
    </div>
  )
}

function OtpLogin({ onBack }: { onBack: () => void }) {
  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [pending, setPending] = useState(false)
  const router = useRouter()

  async function handleSendOtp(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await sendOtp(email)

    if (result.error) {
      setError(result.error)
    } else if (result.pending) {
      setPending(true)
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

  if (pending) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-semibold">Request sent</h1>
          <p className="text-sm text-gray-500">
            Thanks! Your request has been sent to the admin for approval. You&apos;ll be able to sign in once it&apos;s approved.
          </p>
          <button
            onClick={() => { setPending(false); setEmail('') }}
            className="w-full text-sm text-gray-500 underline"
          >
            Use a different email
          </button>
        </div>
      </div>
    )
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
              placeholder="one-time code"
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
            {loading ? 'Sending code…' : 'Send OTP'}
          </button>
        </form>
        <button onClick={onBack} className="w-full text-sm text-gray-500 underline">
          Sign in with a password instead
        </button>
      </div>
    </div>
  )
}

function ResetPassword({ onBack }: { onBack: () => void }) {
  const [identifier, setIdentifier] = useState('')
  const [token, setToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)
  const [done, setDone] = useState(false)
  const router = useRouter()

  async function handleRequest(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    await requestPasswordReset(identifier)
    setSent(true)
    setLoading(false)
  }

  async function handleConfirm(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const result = await confirmPasswordReset(identifier, token, newPassword)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      setDone(true)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6 text-center">
          <h1 className="text-2xl font-semibold">Password updated</h1>
          <p className="text-sm text-gray-500">You can now sign in with your new password.</p>
          <button
            onClick={() => { router.push('/'); router.refresh() }}
            className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium"
          >
            Continue
          </button>
        </div>
      </div>
    )
  }

  if (sent) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-2xl font-semibold">Enter code</h1>
            <p className="text-sm text-gray-500">
              If an account exists for <span className="font-medium text-gray-900">{identifier}</span>, we sent a reset code to its email.
            </p>
          </div>
          <form onSubmit={handleConfirm} className="space-y-4">
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              placeholder="reset code"
              value={token}
              onChange={e => setToken(e.target.value)}
              required
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm text-center tracking-widest focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <input
              type="password"
              placeholder="New password"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
            >
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
          <button
            onClick={() => { setSent(false); setToken(''); setNewPassword(''); setError(null) }}
            className="w-full text-sm text-gray-500 underline"
          >
            Use a different email or username
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-semibold">Reset password</h1>
          <p className="text-sm text-gray-500">Enter your email or username and we&apos;ll send a reset code.</p>
        </div>
        <form onSubmit={handleRequest} className="space-y-4">
          <input
            type="text"
            placeholder="Email or username"
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            required
            autoComplete="username"
            className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
          >
            {loading ? 'Sending code…' : 'Send reset code'}
          </button>
        </form>
        <button onClick={onBack} className="w-full text-sm text-gray-500 underline">
          Back to sign in
        </button>
      </div>
    </div>
  )
}
