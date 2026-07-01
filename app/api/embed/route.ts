import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Called by lib/actions.ts after a post is created to trigger Modal embedding
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-embed-secret')
  if (secret !== process.env.EMBED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { post_id } = await req.json()

  // Fetch the post + media to pass to Modal
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const { data: post } = await supabase
    .from('posts')
    .select('*, media:post_media(*)')
    .eq('id', post_id)
    .single()

  if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 })

  // Resolve public URLs for media
  const mediaUrls = (post.media ?? []).map((m: { storage_path: string }) => {
    const { data } = supabase.storage.from('media').getPublicUrl(m.storage_path)
    return data.publicUrl
  })

  // Modal embeds in the background and POSTs the result to /api/embed/callback
  // once done, so this request doesn't block on the GPU job.
  const modalRes = await fetch(`${process.env.MODAL_EMBED_URL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MODAL_TOKEN}`,
    },
    body: JSON.stringify({
      post_id,
      type: post.type,
      caption: post.caption,
      media_urls: mediaUrls,
      callback_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/embed/callback`,
    }),
  })

  if (!modalRes.ok) {
    const text = await modalRes.text()
    console.error('Modal embed dispatch error', text)
    return NextResponse.json({ error: 'Modal error' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, status: 'accepted' }, { status: 202 })
}
