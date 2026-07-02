'use client'

import { Post } from '@/lib/types'
import { searchPosts } from '@/lib/actions'
import InfiniteScroll from './InfiniteScroll'

interface Props {
  query: string
  posts: Post[]
  hasMore: boolean
  currentUserId: string
}

export default function SearchResults({ query, posts, hasMore, currentUserId }: Props) {
  if (!query) return null

  return (
    <InfiniteScroll
      initialPosts={posts}
      initialHasMore={hasMore}
      loadMore={offset => searchPosts(query, offset)}
      currentUserId={currentUserId}
      emptyMessage={`No results for “${query}”`}
    />
  )
}
