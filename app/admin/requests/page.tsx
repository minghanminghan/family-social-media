import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getAccessRequests } from '@/lib/actions'
import AccessRequestRow from '@/components/AccessRequestRow'

export default async function AdminRequestsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()
  if (!profile?.is_admin) redirect('/')

  const requests = await getAccessRequests()

  return (
    <div className="min-h-screen">
      <main className="max-w-xl mx-auto w-full px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-semibold">Signup requests</h1>
          <Link href="/" className="text-xs text-gray-400 hover:text-gray-700">Back</Link>
        </div>
        <div className="space-y-3">
          {requests.length === 0 && <p className="text-sm text-gray-500">No requests yet.</p>}
          {requests.map(request => (
            <AccessRequestRow key={request.id} request={request} />
          ))}
        </div>
      </main>
    </div>
  )
}
