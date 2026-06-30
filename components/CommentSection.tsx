'use client'

import { useState } from 'react'
import { Post } from '@/lib/types'
import { createComment, deleteComment } from '@/lib/actions'

interface Props {
  post: Post
  currentUserId: string
}

export default function CommentSection({ post, currentUserId }: Props) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!text.trim()) return
    setLoading(true)
    try {
      await createComment(post.id, text.trim())
      setText('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-gray-500">
        {(post.comments?.length ?? 0)} comment{post.comments?.length !== 1 ? 's' : ''}
      </h2>

      <div className="space-y-2">
        {(post.comments ?? [])
          .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
          .map(comment => (
            <div key={comment.id} className="flex items-start gap-2">
              <span className="text-sm font-medium shrink-0">{comment.author?.display_name}</span>
              <p className="text-sm text-gray-700 flex-1">{comment.content}</p>
              {comment.author_id === currentUserId && (
                <button
                  onClick={() => deleteComment(comment.id)}
                  className="text-xs text-gray-300 hover:text-red-400 shrink-0"
                >
                  ×
                </button>
              )}
            </div>
          ))}
      </div>

      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
        />
        <button
          type="submit"
          disabled={loading || !text.trim()}
          className="text-sm bg-gray-900 text-white rounded-lg px-4 disabled:opacity-40"
        >
          Post
        </button>
      </form>
    </div>
  )
}
