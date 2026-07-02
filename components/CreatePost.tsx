'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { createPost, attachPostMedia, finalizePost, deletePost } from '@/lib/actions'
import { createClient } from '@/lib/supabase/client'
import { resolveMedia, postTypeForKind } from '@/lib/mediaKinds'
import { PostType } from '@/lib/types'

export default function CreatePost() {
  const [caption, setCaption] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [pickError, setPickError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const type: PostType = files.length > 0 ? postTypeForKind(resolveMedia(files[0])!.kind) : 'text'

  const previews = useMemo(() => files.map(f => URL.createObjectURL(f)), [files])
  useEffect(() => {
    return () => previews.forEach(u => URL.revokeObjectURL(u))
  }, [previews])

  function addFiles(picked: File[]) {
    if (picked.length === 0) return
    const currentType = files.length > 0 ? postTypeForKind(resolveMedia(files[0])!.kind) : null
    const accepted: File[] = []
    let unsupported = false
    let mismatched = false
    for (const f of picked) {
      const resolved = resolveMedia(f)
      if (!resolved) { unsupported = true; continue }
      if (currentType && postTypeForKind(resolved.kind) !== currentType) { mismatched = true; continue }
      accepted.push(f)
    }
    if (accepted.length) setFiles(prev => [...prev, ...accepted])
    setPickError(
      mismatched ? "Can't mix photos/videos, audio, and documents in one post"
      : unsupported ? "Some files aren't a supported type and were skipped"
      : null
    )
  }

  function removeFile(index: number) {
    setFiles(prev => prev.filter((_, i) => i !== index))
    setPickError(null)
  }

  function reorderFiles(from: number, to: number) {
    if (from === to) return
    setFiles(prev => {
      const next = [...prev]
      const [moved] = next.splice(from, 1)
      next.splice(to, 0, moved)
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!caption.trim() && files.length === 0) return
    setLoading(true)

    let postId: string | undefined
    try {
      const post = await createPost(type, caption.trim() || null)
      postId = post.id

      if (files.length > 0) {
        // Upload straight from the browser to Supabase Storage — these can
        // be large video files, well past what a Server Action / Vercel
        // function body can carry. Modal fetches media by public URL later,
        // so it never needs these bytes routed through the Next.js server.
        const items = await Promise.all(files.map(async (file, i) => {
          const resolved = resolveMedia(file)!
          const path = `${post.author_id}/${post.id}/${i}.${resolved.ext}`
          const { error: uploadError } = await supabase.storage
            .from('media')
            .upload(path, file, { contentType: file.type })
          if (uploadError) throw uploadError
          return { storage_path: path, media_type: resolved.kind, original_filename: file.name || null }
        }))
        await attachPostMedia(post.id, items)
      }

      await finalizePost(post.id)

      setCaption('')
      setFiles([])
      setPickError(null)
      setOpen(false)
    } catch (err) {
      // Best-effort cleanup so a failed upload doesn't leave an empty ghost
      // post visible to the rest of the family feed.
      if (postId) await deletePost(postId).catch(() => {})
      throw err
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
      <textarea
        value={caption}
        onChange={e => setCaption(e.target.value)}
        placeholder={type === 'text' ? "What's on your mind?" : 'Add a caption…'}
        rows={3}
        className="w-full resize-none text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-300"
      />

      <div>
        {files.length > 1 && (
          <p className="text-[11px] text-gray-400 mb-1.5">Drag to reorder slides</p>
        )}
        {pickError && (
          <p className="text-[11px] text-red-500 mb-1.5">{pickError}</p>
        )}
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => {
            const kind = resolveMedia(f)!.kind
            return (
              <div
                key={i}
                draggable
                onDragStart={e => { e.dataTransfer.setData('text/plain', String(i)); setDragIndex(i) }}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); if (dragIndex !== null) reorderFiles(dragIndex, i); setDragIndex(null) }}
                onDragEnd={() => setDragIndex(null)}
                className={`relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 cursor-grab active:cursor-grabbing ${
                  dragIndex === i ? 'opacity-40' : ''
                }`}
              >
                {kind === 'image' && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previews[i]} alt="" className="w-full h-full object-cover pointer-events-none" />
                )}
                {kind === 'video' && (
                  <video src={previews[i]} className="w-full h-full object-cover pointer-events-none" muted preload="metadata" />
                )}
                {(kind === 'audio' || kind === 'file') && (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-gray-50 px-1 text-center pointer-events-none">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-gray-400">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                      <path d="M14 2v6h6" />
                    </svg>
                    <span className="text-[10px] text-gray-500 truncate w-full">{f.name}</span>
                  </div>
                )}
                <span className="absolute top-1 left-1 bg-black/60 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center pointer-events-none">
                  {i + 1}
                </span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute top-1 right-1 bg-black/60 text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px] leading-none hover:bg-black/80"
                  aria-label="Remove"
                >
                  ×
                </button>
              </div>
            )
          })}
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-20 h-20 rounded-lg border border-dashed border-gray-300 text-gray-400 hover:border-gray-400 flex flex-col items-center justify-center gap-0.5"
          >
            <span className="text-xl leading-none">+</span>
            {files.length === 0 && (
              <span className="text-[10px] px-1 text-center leading-tight">Add files</span>
            )}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          className="hidden"
          onChange={e => { addFiles(Array.from(e.target.files ?? [])); e.target.value = '' }}
        />
      </div>

      <div className="flex justify-end gap-2">
        <button
          type="button"
          onClick={() => { setOpen(false); setCaption(''); setFiles([]); setPickError(null) }}
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
