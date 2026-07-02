'use client'

import Image from 'next/image'
import { useState } from 'react'
import { Post } from '@/lib/types'
import { toggleLike, deletePost, editPost } from '@/lib/actions'
import MediaCarousel from './MediaCarousel'
import Comments from './Comments'
import OptionsMenu from './OptionsMenu'
import MarkdownContent from './MarkdownContent'
import { createClient } from '@/lib/supabase/client'

const MAX_VISIBLE_LIKERS = 5

interface Props {
  post: Post
  currentUserId: string
}

export default function PostCard({ post, currentUserId }: Props) {
  const supabase = createClient()
  const liked = (post.likes ?? []).some(l => l.user_id === currentUserId)
  const likeCount = post.likes?.length ?? 0
  const isOwner = post.author_id === currentUserId

  const [editing, setEditing] = useState(false)
  const [editCaption, setEditCaption] = useState(post.caption ?? '')
  const [saving, setSaving] = useState(false)
  const [commentsExpanded, setCommentsExpanded] = useState(false)
  const commentCount = post.comments?.length ?? 0

  const likers = [...(post.likes ?? [])].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )
  const likerNames = likers.map(like => like.user?.display_name ?? 'Someone')
  const visibleLikerNames = likerNames.slice(0, MAX_VISIBLE_LIKERS)
  const hasMoreLikers = likerNames.length > MAX_VISIBLE_LIKERS

  function getMediaUrl(path: string) {
    return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
  }

  async function handleLike() {
    await toggleLike(post.id, liked)
  }

  async function handleDelete() {
    if (confirm('Delete this post?')) await deletePost(post.id)
  }

  function handleStartEdit() {
    setEditCaption(post.caption ?? '')
    setEditing(true)
  }

  async function handleSaveEdit() {
    setSaving(true)
    try {
      await editPost(post.id, editCaption)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

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
          <OptionsMenu
            ariaLabel="Post options"
            menuWidthClassName="w-32"
            items={[
              { label: 'Edit caption', onClick: handleStartEdit },
              { label: 'Delete', onClick: handleDelete, danger: true },
            ]}
          />
        )}
      </div>

      {/* Media */}
      {post.type === 'media' && post.media && post.media.length > 0 && (
        <MediaCarousel
          items={[...post.media].sort((a, b) => a.position - b.position)}
          getUrl={getMediaUrl}
          alt={post.caption ?? ''}
        />
      )}

      {post.type === 'audio' && post.media && post.media.length > 0 && (
        <div className="px-4 pt-3 space-y-2">
          {[...post.media].sort((a, b) => a.position - b.position).map(m => (
            <div key={m.id}>
              {m.original_filename && (
                <p className="text-xs text-gray-500 mb-1">{m.original_filename}</p>
              )}
              <audio controls src={getMediaUrl(m.storage_path)} className="w-full" />
            </div>
          ))}
        </div>
      )}

      {post.type === 'file' && post.media && post.media.length > 0 && (
        <div className="px-4 pt-3 space-y-2">
          {[...post.media].sort((a, b) => a.position - b.position).map(m => (
            <a
              key={m.id}
              href={getMediaUrl(m.storage_path)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-2 hover:border-gray-400"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                <path d="M14 2v6h6" />
              </svg>
              <span className="truncate">{m.original_filename ?? m.storage_path.split('/').pop()}</span>
            </a>
          ))}
        </div>
      )}

      {/* Caption */}
      {editing ? (
        <div className="px-4 pt-3 pb-1 space-y-2">
          <textarea
            value={editCaption}
            onChange={e => setEditCaption(e.target.value)}
            rows={3}
            autoFocus
            className="w-full resize-none text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setEditing(false)}
              className="text-xs text-gray-400 hover:text-gray-700 px-3 py-1.5"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveEdit}
              disabled={saving}
              className="text-xs bg-gray-900 text-white rounded-lg px-4 py-1.5 disabled:opacity-40"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        post.caption && (
          <div className="px-4 pt-3 pb-1">
            {post.type === 'text' ? (
              <MarkdownContent content={post.caption} />
            ) : (
              <p className="text-sm">{post.caption}</p>
            )}
          </div>
        )
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
        <button
          onClick={() => setCommentsExpanded(v => !v)}
          aria-label={commentsExpanded ? 'Hide comments' : 'Show comments'}
          className="flex items-center gap-1 text-sm"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5Z" />
          </svg>
          <span className="text-gray-500">{commentCount}</span>
        </button>
        {likers.length > 0 && (
          <p className="text-xs text-gray-400">
            Liked by: {visibleLikerNames.join(', ')}{hasMoreLikers ? '…' : ''}
          </p>
        )}
      </div>

      <Comments post={post} currentUserId={currentUserId} expanded={commentsExpanded} />
    </article>
  )
}
