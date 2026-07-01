'use client'

import { useState } from 'react'
import { useClickOutside } from '@/lib/hooks'

interface OptionsMenuItem {
  label: string
  onClick: () => void
  danger?: boolean
}

interface Props {
  items: OptionsMenuItem[]
  ariaLabel: string
  menuWidthClassName?: string
}

export default function OptionsMenu({ items, ariaLabel, menuWidthClassName = 'w-32' }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useClickOutside<HTMLDivElement>(open, () => setOpen(false))

  return (
    <div className="relative shrink-0" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="text-gray-600 hover:text-gray-900 px-1"
        aria-label={ariaLabel}
      >
        ⋯
      </button>
      {open && (
        <div className={`absolute right-0 top-full mt-1 ${menuWidthClassName} bg-white border border-gray-200 rounded-lg shadow-sm py-1 z-10`}>
          {items.map(item => (
            <button
              key={item.label}
              onClick={() => { setOpen(false); item.onClick() }}
              className={`w-full text-left text-xs px-3 py-1.5 hover:bg-gray-50 ${item.danger ? 'text-red-400' : 'text-gray-600'}`}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
