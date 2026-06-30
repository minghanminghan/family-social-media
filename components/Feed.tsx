import { Post } from '@/lib/types'
import PostCard from './PostCard'

interface Props {
  posts: Post[]
  currentUserId: string
}

export default function Feed({ posts, currentUserId }: Props) {
  if (posts.length === 0) {
    return (
      <p className="text-center text-sm text-gray-400 py-12">
        No posts yet. Be the first!
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {posts.map(post => (
        <PostCard key={post.id} post={post} currentUserId={currentUserId} />
      ))}
    </div>
  )
}
