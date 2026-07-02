import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getFeedPosts } from '@/lib/actions'
import Feed from '@/components/Feed'
import NavBar from '@/components/NavBar'
import CreatePost from '@/components/CreatePost'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, is_admin')
    .eq('id', user.id)
    .single()

  const { posts, hasMore } = await getFeedPosts(0)

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar userId={user.id} username={profile?.username ?? null} isAdmin={profile?.is_admin ?? false} />
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-6 space-y-6">
        <CreatePost />
        <Feed posts={posts} hasMore={hasMore} currentUserId={user.id} />
      </main>
    </div>
  )
}
