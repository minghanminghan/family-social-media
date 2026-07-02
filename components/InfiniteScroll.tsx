'use client'

import { useEffect, useRef, useState } from 'react'
import { Post } from '@/lib/types'
import PostCard from './PostCard'

interface Props {
  initialPosts: Post[]
  initialHasMore: boolean
  loadMore: (offset: number) => Promise<{ posts: Post[]; hasMore: boolean }>
  currentUserId: string
  emptyMessage: string
}

export default function InfiniteScroll({ initialPosts, initialHasMore, loadMore, currentUserId, emptyMessage }: Props) {
  const [posts, setPosts] = useState(initialPosts)
  const [hasMore, setHasMore] = useState(initialHasMore)
  const [loading, setLoading] = useState(false)
  const loadingRef = useRef(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  // A new initial batch (e.g. navigating to a different search query) replaces
  // whatever infinite scroll had accumulated so far. Reset during render
  // rather than in an effect, per https://react.dev/learn/you-might-not-need-an-effect.
  const [prevInitialPosts, setPrevInitialPosts] = useState(initialPosts)
  if (initialPosts !== prevInitialPosts) {
    setPrevInitialPosts(initialPosts)
    setPosts(initialPosts)
    setHasMore(initialHasMore)
  }

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      entries => {
        if (!entries[0].isIntersecting || loadingRef.current) return
        loadingRef.current = true
        setLoading(true)
        loadMore(posts.length)
          .then(({ posts: next, hasMore: more }) => {
            setPosts(prev => [...prev, ...next])
            setHasMore(more)
          })
          .finally(() => {
            loadingRef.current = false
            setLoading(false)
          })
      },
      { rootMargin: '200px' }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, posts.length, loadMore])

  if (posts.length === 0) {
    return <p className="text-center text-sm text-gray-400 py-12">{emptyMessage}</p>
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} />
      ))}
      {hasMore && (
        <div ref={sentinelRef} className="py-4 text-center text-xs text-gray-400">
          {loading ? 'Loading…' : ''}
        </div>
      )}
    </div>
  )
}
