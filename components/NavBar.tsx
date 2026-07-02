'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import SearchBar from './SearchBar'

export default function NavBar({
  userId,
  username,
  isAdmin,
}: {
  userId: string
  username?: string | null
  isAdmin?: boolean
}) {
  const router = useRouter()
  const supabase = createClient()

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-100">
      <div className="max-w-xl mx-auto px-4 h-14 flex items-center gap-3">
        <Link href="/" className="font-semibold text-sm shrink-0">Family</Link>
        <div className="flex-1">
          <SearchBar />
        </div>
        <Link href={`/profile/${username ?? userId}`} className="text-xs text-gray-400 hover:text-gray-700 shrink-0">
          Profile
        </Link>
        {isAdmin && (
          <Link href="/admin/requests" className="text-xs text-gray-400 hover:text-gray-700 shrink-0">
            Admin
          </Link>
        )}
        <button
          onClick={signOut}
          className="text-xs text-gray-400 hover:text-gray-700 shrink-0"
        >
          Sign out
        </button>
      </div>
    </header>
  )
}
