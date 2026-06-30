'use client'

import Link from 'next/link'
import Image from 'next/image'
import { useState } from 'react'
import { Post } from '@/lib/types'
import { toggleLike, deletePost } from '@/lib/actions'
import MediaCarousel from './MediaCarousel'
import TTSButton from './TTSButton'
import { createClient } from '@/lib/supabase/client'

interface Props {
  post: Post
  currentUserId: string
}

export default function PostCard({ post, currentUserId }: Props) {
  const supabase = createClient()
  const liked = (post.likes ?? []).some(l => l.user_id === currentUserId)
  const likeCount = post.likes?.length ?? 0
  const commentCount = post.comments?.length ?? 0
  const isOwner = post.author_id === currentUserId

  function getMediaUrl(path: string) {
    return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
  }

  async function handleLike() {
    await toggleLike(post.id, liked)
  }

  async function handleDelete() {
    if (confirm('Delete this post?')) await deletePost(post.id)
  }

  const speakText = [post.caption, post.type !== 'text' ? `[${post.type}]` : '']
    .filter(Boolean).join(' ')

  return (
    <article className="border border-gray-100 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-gray-200 overflow-hidden">
            {post.author?.avatar_url ? (
              <Image src={post.author.avatar_url} alt="" width={28} height={28} className="object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-gray-500">
                {post.author?.display_name?.[0]?.toUpperCase()}
              </div>
            )}
          </div>
          <span className="text-sm font-medium">{post.author?.display_name}</span>
          <span className="text-xs text-gray-400">
            {new Date(post.created_at).toLocaleDateString()}
          </span>
        </div>
        {isOwner && (
          <button onClick={handleDelete} className="text-xs text-gray-300 hover:text-red-400">
            Delete
          </button>
        )}
      </div>

      {/* Media */}
      {post.media && post.media.length > 0 && (
        <MediaCarousel
          items={post.media.sort((a, b) => a.position - b.position)}
          getUrl={getMediaUrl}
        />
      )}

      {/* Caption */}
      {post.caption && (
        <p className="px-4 pt-3 pb-1 text-sm">{post.caption}</p>
      )}

      {/* Actions */}
      <div className="flex items-center gap-4 px-4 py-3">
        <button onClick={handleLike} className="flex items-center gap-1 text-sm">
          <span>{liked ? '♥' : '♡'}</span>
          <span className="text-gray-500">{likeCount}</span>
        </button>
        <Link href={`/post/${post.id}`} className="flex items-center gap-1 text-sm text-gray-500">
          <span>💬</span>
          <span>{commentCount}</span>
        </Link>
        <TTSButton text={speakText} />
      </div>
    </article>
  )
}
