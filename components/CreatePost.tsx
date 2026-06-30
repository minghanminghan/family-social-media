'use client'

import { useState, useRef } from 'react'
import { createPost } from '@/lib/actions'
import { PostType } from '@/lib/types'

const TYPE_LABELS: Record<PostType, string> = {
  text: 'Text',
  image: 'Photo',
  video: 'Video',
  carousel: 'Album',
}

export default function CreatePost() {
  const [type, setType] = useState<PostType>('text')
  const [caption, setCaption] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const acceptsMedia = type !== 'text'
  const multipleFiles = type === 'carousel'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!caption.trim() && files.length === 0) return
    setLoading(true)

    const form = new FormData()
    form.append('type', type)
    if (caption.trim()) form.append('caption', caption.trim())
    files.forEach(f => form.append('media', f))

    try {
      await createPost(form)
      setCaption('')
      setFiles([])
      setOpen(false)
      setType('text')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full border border-gray-200 rounded-xl px-4 py-3 text-left text-sm text-gray-400 hover:border-gray-300"
      >
        Share something…
      </button>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="border border-gray-200 rounded-xl p-4 space-y-3">
      {/* Type selector */}
      <div className="flex gap-2">
        {(Object.keys(TYPE_LABELS) as PostType[]).map(t => (
          <button
            key={t}
            type="button"
            onClick={() => { setType(t); setFiles([]) }}
            className={`text-xs px-3 py-1 rounded-full border ${
              type === t
                ? 'bg-gray-900 text-white border-gray-900'
                : 'border-gray-200 text-gray-500 hover:border-gray-400'
            }`}
          >
            {TYPE_LABELS[t]}
          </button>
        ))}
      </div>

      <textarea
        value={caption}
        onChange={e => setCaption(e.target.value)}
        placeholder={type === 'text' ? "What's on your mind?" : 'Add a caption…'}
        rows={3}
        className="w-full resize-none text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
      />

      {acceptsMedia && (
        <div>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="text-xs text-gray-500 border border-dashed border-gray-300 rounded-lg px-3 py-2 hover:border-gray-400"
          >
            {files.length > 0 ? `${files.length} file(s) selected` : `Choose ${type === 'video' ? 'video' : 'photo(s)'}`}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept={type === 'video' ? 'video/*' : 'image/*'}
            multiple={multipleFiles}
            className="hidden"
            onChange={e => setFiles(Array.from(e.target.files ?? []))}
          />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setCaption(''); setFiles([]) }}
          className="text-xs text-gray-400 hover:text-gray-700 px-3 py-1.5"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || (!caption.trim() && files.length === 0)}
          className="text-xs bg-gray-900 text-white rounded-lg px-4 py-1.5 disabled:opacity-40"
        >
          {loading ? 'Posting…' : 'Post'}
        </button>
      </div>
    </form>
  )
}
