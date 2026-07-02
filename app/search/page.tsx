import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { searchPosts } from '@/lib/actions'
import NavBar from '@/components/NavBar'
import SearchResults from '@/components/SearchResults'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, is_admin')
    .eq('id', user.id)
    .single()

  const { posts, hasMore } = await searchPosts(q ?? '', 0)

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar userId={user.id} username={profile?.username ?? null} isAdmin={profile?.is_admin ?? false} />
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-6">
        <SearchResults query={q ?? ''} posts={posts} hasMore={hasMore} currentUserId={user.id} />
      </main>
    </div>
  )
}
