import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import PostCard from '@/components/PostCard'

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, is_admin')
    .eq('id', user.id)
    .single()

  const { data: post, error } = await supabase
    .from('posts')
    .select(`
      *,
      author:profiles!posts_author_id_fkey(*),
      media:post_media(*),
      likes(user_id, created_at, user:profiles(*)),
      comments(*, author:profiles(*))
    `)
    .eq('id', id)
    .single()

  if (error) console.error('Failed to load post', error)
  if (!post) notFound()

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar userId={user.id} username={profile?.username ?? null} isAdmin={profile?.is_admin ?? false} />
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-6 space-y-4">
        <PostCard post={post} currentUserId={user.id} />
      </main>
    </div>
  )
}
