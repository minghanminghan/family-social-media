import { NextRequest, NextResponse } from 'next/server'

// Embeds a text search query via Modal and returns the 512-dim vector
export async function POST(req: NextRequest) {
  const secret = req.headers.get('x-embed-secret')
  if (secret !== process.env.EMBED_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { text } = await req.json()
  if (!text) return NextResponse.json({ error: 'Missing text' }, { status: 400 })

  const modalRes = await fetch(`${process.env.MODAL_EMBED_QUERY_URL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.MODAL_TOKEN}`,
    },
    body: JSON.stringify({ text }),
  })

  if (!modalRes.ok) {
    return NextResponse.json({ error: 'Modal error' }, { status: 502 })
  }

  const { embedding } = await modalRes.json()
  return NextResponse.json({ embedding })
}
