'use client'

import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'
import { PostMedia } from '@/lib/types'

interface Props {
  items: PostMedia[]
  getUrl: (path: string) => string
  alt?: string
}

export default function MediaCarousel({ items, getUrl, alt = '' }: Props) {
  const [index, setIndex] = useState(0)
  const trackRef = useRef<HTMLDivElement>(null)
  const videoRefs = useRef<Record<number, HTMLVideoElement | null>>({})

  // Slides off-screen are still mounted (so swiping between them doesn't
  // re-fetch/restart playback), so anything not currently active must be
  // paused explicitly or its audio would keep playing after swiping away.
  useEffect(() => {
    Object.entries(videoRefs.current).forEach(([i, el]) => {
      if (Number(i) !== index) el?.pause()
    })
  }, [index])

  if (items.length === 0) return null

  function goTo(i: number) {
    const track = trackRef.current
    if (!track) return
    track.scrollTo({ left: i * track.clientWidth, behavior: 'smooth' })
  }

  function handleScroll() {
    const track = trackRef.current
    if (!track) return
    setIndex(Math.round(track.scrollLeft / track.clientWidth))
  }

  return (
    <div className="relative bg-black aspect-square">
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="no-scrollbar flex w-full h-full overflow-x-auto snap-x snap-mandatory"
      >
        {items.map((item, i) => {
          const url = getUrl(item.storage_path)
          return (
            <div key={item.id} className="relative w-full h-full shrink-0 snap-center">
              {item.media_type === 'video' ? (
                <video
                  ref={el => { videoRefs.current[i] = el }}
                  src={url}
                  controls
                  className="w-full h-full object-contain"
                  playsInline
                />
              ) : (
                <Image
                  src={url}
                  alt={alt}
                  fill
                  className="object-contain"
                  unoptimized
                />
              )}
            </div>
          )
        })}
      </div>

      {items.length > 1 && (
        <>
          {index > 0 && (
            <button
              onClick={() => goTo(index - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm"
            >
              ‹
            </button>
          )}
          {index < items.length - 1 && (
            <button
              onClick={() => goTo(index + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm"
            >
              ›
            </button>
          )}
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => goTo(i)}
                className={`w-1.5 h-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
