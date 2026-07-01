'use client'

import { useState } from 'react'
import { Comment } from '@/lib/types'
import { createComment, deleteComment, editComment } from '@/lib/actions'
import OptionsMenu from './OptionsMenu'

export interface CommentNode extends Comment {
  replies: CommentNode[]
}

interface Props {
  comment: CommentNode
  postId: string
  currentUserId: string
  depth: number
  activeReplyId: string | null
  setActiveReplyId: (id: string | null) => void
}

function countReplies(node: CommentNode): number {
  return node.replies.reduce((sum, r) => sum + 1 + countReplies(r), 0)
}

export default function CommentThread({ comment, postId, currentUserId, depth, activeReplyId, setActiveReplyId }: Props) {
  const [collapsed, setCollapsed] = useState(false)
  const replying = activeReplyId === comment.id
  const [replyText, setReplyText] = useState('')
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [editText, setEditText] = useState(comment.content)
  const [saving, setSaving] = useState(false)

  const replyCount = countReplies(comment)

  async function handleReply(e: React.FormEvent) {
    e.preventDefault()
    if (!replyText.trim()) return
    setLoading(true)
    try {
      await createComment(postId, replyText.trim(), comment.id)
      setReplyText('')
      setActiveReplyId(null)
    } finally {
      setLoading(false)
    }
  }

  function handleStartEdit() {
    setEditText(comment.content)
    setEditing(true)
  }

  async function handleDelete() {
    if (confirm('Delete this comment?')) await deleteComment(comment.id)
  }

  async function handleSaveEdit() {
    if (!editText.trim()) return
    setSaving(true)
    try {
      await editComment(comment.id, postId, editText.trim())
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div>
      <div className="flex items-start gap-2">
        <span className="text-sm font-medium shrink-0">{comment.author?.display_name}</span>

        {editing ? (
          <div className="flex-1 space-y-1.5">
            <input
              value={editText}
              onChange={e => setEditText(e.target.value)}
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
            />
            <div className="flex gap-2">
              <button onClick={() => setEditing(false)} className="text-xs text-gray-400 hover:text-gray-700">
                Cancel
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={saving || !editText.trim()}
                className="text-xs font-medium text-gray-900 hover:text-gray-700 disabled:opacity-40"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-700 flex-1">{comment.content}</p>
        )}

        {!editing && (
          <button
            onClick={() => setActiveReplyId(replying ? null : comment.id)}
            aria-label="Reply"
            className="shrink-0 text-gray-400 hover:text-gray-700 px-1"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 17 4 12 9 7" />
              <path d="M20 18v-2a4 4 0 0 0-4-4H4" />
            </svg>
          </button>
        )}

        {comment.author_id === currentUserId && !editing && (
          <OptionsMenu
            ariaLabel="Comment options"
            menuWidthClassName="w-28"
            items={[
              { label: 'Edit', onClick: handleStartEdit },
              { label: 'Delete', onClick: handleDelete, danger: true },
            ]}
          />
        )}
      </div>

      {replying && (
        <form onSubmit={handleReply} className="flex gap-2 mt-2">
          <input
            value={replyText}
            onChange={e => setReplyText(e.target.value)}
            placeholder={`Reply to ${comment.author?.display_name ?? 'comment'}…`}
            autoFocus
            className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-gray-300"
          />
          <button
            type="submit"
            disabled={loading || !replyText.trim()}
            className="text-sm bg-gray-900 text-white rounded-lg px-4 disabled:opacity-40"
          >
            Reply
          </button>
        </form>
      )}

      {comment.replies.length > 0 && (
        <div className="mt-2">
          {collapsed ? (
            <button
              onClick={() => setCollapsed(false)}
              className="flex items-center gap-2 text-xs text-gray-400 hover:text-gray-700"
            >
              <span className="w-5 flex justify-center shrink-0">
                <span className="w-px h-3 bg-gray-300" />
              </span>
              {replyCount} repl{replyCount !== 1 ? 'ies' : 'y'}
            </button>
          ) : (
            comment.replies.map((r, i) => {
              const isLast = i === comment.replies.length - 1
              return (
                <div key={r.id} className="flex">
                  <button
                    type="button"
                    onClick={() => setCollapsed(true)}
                    aria-label="Collapse replies"
                    className="w-5 shrink-0 relative group"
                  >
                    <span className="absolute left-1/2 -translate-x-1/2 top-0 h-[10px] w-px bg-gray-200 group-hover:bg-gray-400" />
                    <span className="absolute left-1/2 top-[10px] w-2.5 h-px bg-gray-200 group-hover:bg-gray-400" />
                    {!isLast && (
                      <span className="absolute left-1/2 -translate-x-1/2 top-[10px] bottom-0 w-px bg-gray-200 group-hover:bg-gray-400" />
                    )}
                  </button>
                  <div className="flex-1 min-w-0 pb-2">
                    <CommentThread
                      comment={r}
                      postId={postId}
                      currentUserId={currentUserId}
                      depth={depth + 1}
                      activeReplyId={activeReplyId}
                      setActiveReplyId={setActiveReplyId}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
