'use client'

import { Post } from '@/lib/types'
import PostCard from './PostCard'

interface Props {
  query: string
  posts: Post[]
  currentUserId: string
}

export default function SearchResults({ query, posts, currentUserId }: Props) {
  return (
    <div className="space-y-6">
      {query && posts.length === 0 && (
        <p className="text-sm text-gray-400 text-center py-8">No results for &ldquo;{query}&rdquo;</p>
      )}

      <div className="space-y-4">
        {posts.map(post => (
          <PostCard key={post.id} post={post} currentUserId={currentUserId} />
        ))}
      </div>
    </div>
  )
}
