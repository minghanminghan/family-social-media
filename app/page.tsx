import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Feed from '@/components/Feed'
import NavBar from '@/components/NavBar'
import CreatePost from '@/components/CreatePost'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles(*),
      media:post_media(*),
      likes(user_id),
      comments(id)
    `)
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar userId={user.id} />
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-6 space-y-6">
        <CreatePost />
        <Feed posts={posts ?? []} currentUserId={user.id} />
      </main>
    </div>
  )
}
