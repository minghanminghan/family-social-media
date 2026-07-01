import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import NavBar from '@/components/NavBar'
import SearchResults from '@/components/SearchResults'
import { Post } from '@/lib/types'

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  let posts: Post[] = []

  if (q && q.trim().length > 0) {
    // Get query embedding from Modal, then search with pgvector
    const embedRes = await fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/embed/query`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-embed-secret': process.env.EMBED_SECRET! },
      body: JSON.stringify({ text: q }),
      cache: 'no-store',
    })

    if (embedRes.ok) {
      const { embedding } = await embedRes.json()

      const { data: results } = await supabase.rpc('search_posts', {
        query_embedding: embedding,
        match_count: 20,
      })

      if (results && results.length > 0) {
        const postIds = results.map((r: { post_id: string }) => r.post_id)
        const { data } = await supabase
          .from('posts')
          .select(`*, author:profiles!posts_author_id_fkey(*), media:post_media(*), likes(user_id)`)
          .in('id', postIds)

        // Preserve similarity ordering
        const byId = Object.fromEntries((data ?? []).map((p: { id: string }) => [p.id, p]))
        posts = results.map((r: { post_id: string; similarity: number }) => ({
          ...byId[r.post_id],
          similarity: r.similarity,
        })).filter(Boolean)
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar userId={user.id} />
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-6">
        <SearchResults query={q ?? ''} posts={posts} currentUserId={user.id} />
      </main>
    </div>
  )
}
