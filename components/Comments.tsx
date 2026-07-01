'use client'

import { useState } from 'react'
import { Comment, Post } from '@/lib/types'
import { createComment } from '@/lib/actions'
import CommentThread, { CommentNode } from './CommentThread'

function buildTree(comments: Comment[]): CommentNode[] {
  const children = new Map<string | null, Comment[]>()
  for (const c of comments) {
    const key = c.parent_id
    if (!children.has(key)) children.set(key, [])
    children.get(key)!.push(c)
  }
  function attach(parentId: string | null): CommentNode[] {
    return (children.get(parentId) ?? [])
      .slice()
      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      .map(c => ({ ...c, replies: attach(c.id) }))
  }
  return attach(null)
}

interface Props {
  post: Post
  currentUserId: string
  expanded: boolean
}

export default function Comments({ post, currentUserId, expanded }: Props) {
  const comments = post.comments ?? []
  const tree = buildTree(comments)
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeReplyId, setActiveReplyId] = useState<string | null>(null)

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

  if (!expanded) return null

  return (
    <div className="border-t border-gray-100 px-4 py-3 space-y-3">
      {tree.length > 0 && (
        <div className="space-y-3">
          {tree.map(c => (
            <CommentThread
              key={c.id}
              comment={c}
              postId={post.id}
              currentUserId={currentUserId}
              depth={0}
              activeReplyId={activeReplyId}
              setActiveReplyId={setActiveReplyId}
            />
          ))}
        </div>
      )}

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
