'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Post } from '@/lib/types'
import PostCard from './PostCard'

interface Props {
  query: string
  posts: object[]
  currentUserId: string
}

export default function SearchResults({ query, posts, currentUserId }: Props) {
  const router = useRouter()
  const [input, setInput] = useState(query)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (input.trim()) router.push(`/search?q=${encodeURIComponent(input.trim())}`)
  }

  return (
    <div className="space-y-6">
      {/* <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Search…"
          autoFocus
          className="flex-1 border border-gray-200 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
        <button type="submit" className="bg-gray-900 text-white rounded-lg px-4 text-sm">
          Search
        </button>
      </form> */}

      {query && posts.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">No results for &ldquo;{query}&rdquo;</p>
      )}

      <div className="space-y-4">
        {(posts as Post[]).map(post => (
          <PostCard key={post.id} post={post} currentUserId={currentUserId} />
        ))}
      </div>
    </div>
  )
}
