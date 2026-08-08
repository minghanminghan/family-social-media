import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getGalleryItems } from '@/lib/actions'
import NavBar from '@/components/NavBar'
import MediaGallery from '@/components/MediaGallery'

export default async function MediaPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, is_admin')
    .eq('id', user.id)
    .single()

  // Only the default (Media) tab is rendered server-side; Links/Documents
  // load on first switch.
  const { items, hasMore, nextOffset } = await getGalleryItems('media', 0)

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar userId={user.id} username={profile?.username ?? null} isAdmin={profile?.is_admin ?? false} />
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-6">
        <MediaGallery initialItems={items} initialHasMore={hasMore} initialNextOffset={nextOffset} />
      </main>
    </div>
  )
}
