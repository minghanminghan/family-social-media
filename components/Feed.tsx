'use client'

import { Post } from '@/lib/types'
import { getFeedPosts } from '@/lib/actions'
import InfiniteScroll from './InfiniteScroll'

interface Props {
  posts: Post[]
  hasMore: boolean
  currentUserId: string
}

export default function Feed({ posts, hasMore, currentUserId }: Props) {
  return (
    <InfiniteScroll
      initialPosts={posts}
      initialHasMore={hasMore}
      loadMore={getFeedPosts}
      currentUserId={currentUserId}
      emptyMessage="No posts yet. Be the first!"
    />
  )
}
