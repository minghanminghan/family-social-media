'use client'

import { useTransition } from 'react'
import { AccessRequest } from '@/lib/types'
import { approveAccessRequest, denyAccessRequest } from '@/lib/actions'

const statusStyles: Record<AccessRequest['status'], string> = {
  pending: 'text-yellow-600',
  approved: 'text-green-600',
  denied: 'text-gray-400',
}

export default function AccessRequestRow({ request }: { request: AccessRequest }) {
  const [isPending, startTransition] = useTransition()

  return (
    <div className="flex items-center justify-between border border-gray-100 rounded-lg px-4 py-3">
      <div>
        <p className="text-sm font-medium">{request.email}</p>
        <p className="text-xs text-gray-400">
          {new Date(request.requested_at).toLocaleString()} ·{' '}
          <span className={statusStyles[request.status]}>{request.status}</span>
        </p>
      </div>
      {request.status === 'pending' && (
        <div className="flex gap-2 shrink-0">
          <button
            disabled={isPending}
            onClick={() => startTransition(() => approveAccessRequest(request.id))}
            className="text-xs bg-gray-900 text-white rounded-lg px-3 py-1.5 disabled:opacity-40"
          >
            Approve
          </button>
          <button
            disabled={isPending}
            onClick={() => startTransition(() => denyAccessRequest(request.id))}
            className="text-xs text-gray-400 hover:text-red-500 disabled:opacity-40"
          >
            Deny
          </button>
        </div>
      )}
    </div>
  )
}
