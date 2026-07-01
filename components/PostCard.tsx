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
          {liked ? (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="#ed4956">
              <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938Z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16.792 3.904A4.989 4.989 0 0 1 21.5 9.122c0 3.072-2.652 4.959-5.197 7.222-2.512 2.243-3.865 3.469-4.303 3.752-.477-.309-2.143-1.823-4.303-3.752C5.141 14.072 2.5 12.167 2.5 9.122a4.989 4.989 0 0 1 4.708-5.218 4.21 4.21 0 0 1 3.675 1.941c.84 1.175.98 1.763 1.12 1.763s.278-.588 1.11-1.766a4.17 4.17 0 0 1 3.679-1.938Z" />
            </svg>
          )}
          <span className="text-gray-500">{likeCount}</span>
        </button>
        <Link href={`/post/${post.id}`} className="flex items-center gap-1 text-sm text-gray-500">
          <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.656 17.008a9.993 9.993 0 1 0-3.59 3.615L21 22Z" />
          </svg>
          <span>{commentCount}</span>
        </Link>
      </div>
    </article>
  )
}
