'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { GalleryItem, GalleryTab } from '@/lib/types'
import { getGalleryItems } from '@/lib/actions'
import { createClient } from '@/lib/supabase/client'

const TABS: { key: GalleryTab; label: string }[] = [
  { key: 'media', label: 'Media' },
  { key: 'links', label: 'Links' },
  { key: 'documents', label: 'Documents' },
]

const EMPTY_MESSAGE: Record<GalleryTab, string> = {
  media: 'No photos or videos yet.',
  links: 'No links shared yet.',
  documents: 'No documents or audio yet.',
}

interface TabState {
  items: GalleryItem[]
  hasMore: boolean
  nextOffset: number
  loaded: boolean
  failed: boolean
}

const EMPTY_TAB: TabState = { items: [], hasMore: true, nextOffset: 0, loaded: false, failed: false }

// Stable identity for de-duping and for React keys. Offset pagination over
// created_at DESC can hand back a row twice if someone posts while the
// gallery is open, which would otherwise duplicate a key.
function itemKey(item: GalleryItem) {
  return item.kind === 'link' ? `${item.post.id}-${item.url}` : item.id
}

interface Props {
  initialItems: GalleryItem[]
  initialHasMore: boolean
  initialNextOffset: number
}

export default function MediaGallery({ initialItems, initialHasMore, initialNextOffset }: Props) {
  const supabase = createClient()
  const [tab, setTab] = useState<GalleryTab>('media')
  // Each tab keeps whatever it has already loaded, so switching back and
  // forth doesn't re-fetch or lose the user's scroll position in that tab.
  const [state, setState] = useState<Record<GalleryTab, TabState>>({
    media: {
      items: initialItems,
      hasMore: initialHasMore,
      nextOffset: initialNextOffset,
      loaded: true,
      failed: false,
    },
    links: EMPTY_TAB,
    documents: EMPTY_TAB,
  })

  // Guarded per tab rather than globally: switching tabs mid-load starts a
  // second request, and each response appends to its own tab's state, so a
  // shared guard would just drop the new tab's first page on the floor.
  const loadingRef = useRef<Partial<Record<GalleryTab, boolean>>>({})
  const [loadingTabs, setLoadingTabs] = useState<Partial<Record<GalleryTab, boolean>>>({})
  const sentinelRef = useRef<HTMLDivElement>(null)

  const active = state[tab]
  // A failed tab stops auto-retrying (nothing in the deps would change, so
  // it would either wedge or spin) and waits for the retry button below.
  const needsFirstPage = !active.loaded && !active.failed
  const loading = loadingTabs[tab] ?? false

  useEffect(() => {
    const sentinel = sentinelRef.current
    // The first page of a not-yet-opened tab is loaded eagerly on switch;
    // every later page waits for the sentinel to scroll into view.
    if (!needsFirstPage && (!sentinel || !active.hasMore || active.failed)) return

    async function load() {
      if (loadingRef.current[tab]) return
      loadingRef.current[tab] = true
      setLoadingTabs(prev => ({ ...prev, [tab]: true }))
      try {
        const { items, hasMore, nextOffset } = await getGalleryItems(tab, active.nextOffset)
        setState(prev => {
          const seen = new Set(prev[tab].items.map(itemKey))
          return {
            ...prev,
            [tab]: {
              items: [...prev[tab].items, ...items.filter(item => !seen.has(itemKey(item)))],
              hasMore,
              nextOffset,
              loaded: true,
              failed: false,
            },
          }
        })
      } catch (err) {
        console.error('Failed to load gallery items', err)
        setState(prev => ({ ...prev, [tab]: { ...prev[tab], failed: true } }))
      } finally {
        loadingRef.current[tab] = false
        setLoadingTabs(prev => ({ ...prev, [tab]: false }))
      }
    }

    if (needsFirstPage) {
      load()
      return
    }

    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting) load()
      },
      { rootMargin: '200px' }
    )
    observer.observe(sentinel!)
    return () => observer.disconnect()
  }, [tab, needsFirstPage, active.hasMore, active.nextOffset, active.failed])

  function mediaUrl(path: string) {
    return supabase.storage.from('media').getPublicUrl(path).data.publicUrl
  }

  return (
    <div>
      <div className="flex gap-1 rounded-full bg-gray-100 p-1 mb-4">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 rounded-full py-1.5 text-xs transition-colors ${
              t.key === tab ? 'bg-white font-medium shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Only call a tab empty once it's out of pages — a Links page can
          legitimately yield no items (the caption pre-filter is looser than
          the URL extraction) while more pages are still coming. */}
      {active.items.length === 0 && active.loaded && !active.hasMore ? (
        <p className="text-center text-sm text-gray-400 py-12">{EMPTY_MESSAGE[tab]}</p>
      ) : tab === 'media' ? (
        <div className="grid grid-cols-3 gap-1">
          {active.items.map(item =>
            item.kind === 'attachment' ? (
              <Link
                key={itemKey(item)}
                href={`/post/${item.post.id}`}
                className="relative aspect-square overflow-hidden rounded-sm bg-gray-100"
              >
                {item.media_type === 'video' ? (
                  <>
                    {/* #t=0.1 makes browsers (Safari especially) render a real
                        frame instead of a blank first frame as the poster. */}
                    <video
                      src={`${mediaUrl(item.storage_path)}#t=0.1`}
                      preload="metadata"
                      muted
                      playsInline
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute bottom-1 right-1 rounded-full bg-black/50 p-1 text-white">
                      <svg viewBox="0 0 24 24" width="10" height="10" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </>
                ) : (
                  <Image
                    src={mediaUrl(item.storage_path)}
                    alt={item.post.caption ?? ''}
                    fill
                    sizes="(max-width: 640px) 33vw, 200px"
                    className="object-cover"
                    unoptimized
                  />
                )}
              </Link>
            ) : null
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {active.items.map(item =>
            item.kind === 'link' ? (
              <GalleryRow
                key={itemKey(item)}
                href={item.url}
                external
                icon={
                  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                  </svg>
                }
                title={item.url}
                postId={item.post.id}
                subtitle={`${item.post.author?.display_name ?? 'Someone'} · ${new Date(item.post.created_at).toLocaleDateString()}`}
              />
            ) : (
              <GalleryRow
                key={itemKey(item)}
                href={mediaUrl(item.storage_path)}
                external
                icon={
                  item.media_type === 'audio' ? (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9 18V5l12-2v13" />
                      <circle cx="6" cy="18" r="3" />
                      <circle cx="18" cy="16" r="3" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                      <path d="M14 2v6h6" />
                    </svg>
                  )
                }
                title={item.original_filename ?? item.storage_path.split('/').pop() ?? 'File'}
                postId={item.post.id}
                subtitle={`${item.post.author?.display_name ?? 'Someone'} · ${new Date(item.post.created_at).toLocaleDateString()}`}
              />
            )
          )}
        </div>
      )}

      {active.failed && !loading && (
        <div className="py-6 text-center text-sm text-gray-400">
          Couldn’t load.{' '}
          <button
            onClick={() => setState(prev => ({ ...prev, [tab]: { ...prev[tab], failed: false } }))}
            className="text-gray-700 underline"
          >
            Retry
          </button>
        </div>
      )}

      {active.hasMore && !active.failed && (
        <div ref={sentinelRef} className="py-4 text-center text-xs text-gray-400">
          {loading ? 'Loading…' : ''}
        </div>
      )}
    </div>
  )
}

// Links and documents share a row: the row itself opens the target (the URL
// or the stored file), with a separate link back to the post it came from —
// nested anchors aren't valid, hence the two side-by-side elements.
function GalleryRow({
  href,
  external,
  icon,
  title,
  subtitle,
  postId,
}: {
  href: string
  external?: boolean
  icon: React.ReactNode
  title: string
  subtitle: string
  postId: string
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 hover:border-gray-400">
      <a
        href={href}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
        className="flex min-w-0 flex-1 items-center gap-2"
      >
        <span className="shrink-0 text-gray-400">{icon}</span>
        <span className="min-w-0">
          <span className="block truncate text-sm">{title}</span>
          <span className="block text-xs text-gray-400">{subtitle}</span>
        </span>
      </a>
      <Link href={`/post/${postId}`} className="shrink-0 text-xs text-gray-400 hover:text-gray-700">
        Post
      </Link>
    </div>
  )
}
