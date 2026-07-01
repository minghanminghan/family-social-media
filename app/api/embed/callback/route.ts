import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

// Called by modal/embed.py once a background embedding job finishes
export async function POST(req: NextRequest) {
  const secret = req.headers.get('Authorization')
  if (secret !== `Bearer ${process.env.EMBED_CALLBACK_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { post_id, embedding, error: embedError } = await req.json()
  if (!post_id) return NextResponse.json({ error: 'Missing post_id' }, { status: 400 })

  if (embedError) {
    console.error(`Modal embed failed for post ${post_id}`, embedError)
    return NextResponse.json({ ok: true })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )

  const { error } = await supabase
    .from('posts')
    .update({ embedding })
    .eq('id', post_id)

  if (error) {
    console.error(`Failed to store embedding for post ${post_id}`, error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
