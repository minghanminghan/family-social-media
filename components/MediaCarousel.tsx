'use client'

import Image from 'next/image'
import { useState } from 'react'
import { PostMedia } from '@/lib/types'

interface Props {
  items: PostMedia[]
  getUrl: (path: string) => string
}

export default function MediaCarousel({ items, getUrl }: Props) {
  const [index, setIndex] = useState(0)

  if (items.length === 0) return null

  const current = items[index]
  const url = getUrl(current.storage_path)

  return (
    <div className="relative bg-black aspect-square">
      {current.media_type === 'video' ? (
        <video
          key={url}
          src={url}
          controls
          className="w-full h-full object-contain"
          playsInline
        />
      ) : (
        <Image
          src={url}
          alt=""
          fill
          className="object-contain"
          unoptimized
        />
      )}

      {items.length > 1 && (
        <>
          {index > 0 && (
            <button
              onClick={() => setIndex(i => i - 1)}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm"
            >
              ‹
            </button>
          )}
          {index < items.length - 1 && (
            <button
              onClick={() => setIndex(i => i + 1)}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/40 text-white rounded-full w-8 h-8 flex items-center justify-center text-sm"
            >
              ›
            </button>
          )}
          <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1">
            {items.map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={`w-1.5 h-1.5 rounded-full ${i === index ? 'bg-white' : 'bg-white/40'}`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
