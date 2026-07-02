'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { setUsername, setPassword } from '@/lib/actions'
import { Profile } from '@/lib/types'

export default function ProfileForm({ profile }: { profile: Profile }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">{profile.display_name}</h1>
        <p className="text-sm text-gray-500">{profile.username ? `@${profile.username}` : 'No username set yet'}</p>
      </div>
      <UsernameForm profile={profile} />
      <PasswordForm />
    </div>
  )
}

function UsernameForm({ profile }: { profile: Profile }) {
  const [username, setUsernameInput] = useState(profile.username ?? '')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setSuccess(false)

    const result = await setUsername(username)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      if (result.username && result.username !== profile.username) {
        router.replace(`/profile/${result.username}`)
      }
      router.refresh()
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-sm font-medium">Username</h2>
      <input
        type="text"
        placeholder="username"
        value={username}
        onChange={e => setUsernameInput(e.target.value)}
        required
        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
      />
      <p className="text-xs text-gray-400">3-20 characters: lowercase letters, numbers, underscores.</p>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && !error && <p className="text-sm text-green-600">Saved.</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Save username'}
      </button>
    </form>
  )
}

function PasswordForm() {
  const [password, setPasswordInput] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSuccess(false)

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    const result = await setPassword(password)

    if (result.error) {
      setError(result.error)
    } else {
      setSuccess(true)
      setPasswordInput('')
      setConfirmPassword('')
    }
    setLoading(false)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h2 className="text-sm font-medium">Password</h2>
      <input
        type="password"
        placeholder="New password"
        value={password}
        onChange={e => setPasswordInput(e.target.value)}
        required
        autoComplete="new-password"
        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
      />
      <input
        type="password"
        placeholder="Confirm new password"
        value={confirmPassword}
        onChange={e => setConfirmPassword(e.target.value)}
        required
        autoComplete="new-password"
        className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
      />
      <p className="text-xs text-gray-400">At least 8 characters.</p>
      {error && <p className="text-sm text-red-500">{error}</p>}
      {success && !error && <p className="text-sm text-green-600">Password updated.</p>}
      <button
        type="submit"
        disabled={loading}
        className="w-full bg-gray-900 text-white rounded-lg py-2.5 text-sm font-medium disabled:opacity-50"
      >
        {loading ? 'Saving…' : 'Update password'}
      </button>
    </form>
  )
}
