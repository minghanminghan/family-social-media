'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from './supabase/server'
import { PostType } from './types'

// ── Auth ──────────────────────────────────────────────────────────────────

export async function sendOtp(email: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({ email })
  if (error) return { error: error.message }
  return { error: null }
}

export async function verifyOtp(email: string, token: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ email, token, type: 'email' })
  if (error) return { error: error.message }
  return { error: null }
}

// ── Posts ──────────────────────────────────────────────────────────────────

export async function createPost(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const type = formData.get('type') as PostType
  const caption = formData.get('caption') as string | null
  const files = formData.getAll('media') as File[]

  const { data: post, error } = await supabase
    .from('posts')
    .insert({ author_id: user.id, type, caption: caption || null })
    .select()
    .single()

  if (error) throw error

  // Upload media files
  if (files.length > 0 && files[0].size > 0) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()
      const path = `${user.id}/${post.id}/${i}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(path, file)

      if (uploadError) throw uploadError

      const mediaType = file.type.startsWith('video') ? 'video' : 'image'

      await supabase.from('post_media').insert({
        post_id: post.id,
        position: i,
        storage_path: path,
        media_type: mediaType,
      })
    }
  }

  // Kick off embedding asynchronously (fire-and-forget via API route)
  void fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/embed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-embed-secret': process.env.EMBED_SECRET! },
    body: JSON.stringify({ post_id: post.id }),
  }).catch(() => {})

  revalidatePath('/')
  return post
}

export async function deletePost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', user.id)

  if (error) throw error
  revalidatePath('/')
}

// ── Likes ──────────────────────────────────────────────────────────────────

export async function toggleLike(postId: string, liked: boolean) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  if (liked) {
    await supabase.from('likes').delete().eq('post_id', postId).eq('user_id', user.id)
  } else {
    await supabase.from('likes').insert({ post_id: postId, user_id: user.id })
  }

  revalidatePath('/')
}

// ── Comments ───────────────────────────────────────────────────────────────

export async function createComment(postId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase
    .from('comments')
    .insert({ post_id: postId, author_id: user.id, content })

  if (error) throw error
  revalidatePath(`/post/${postId}`)
  revalidatePath('/')
}

export async function deleteComment(commentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('author_id', user.id)

  if (error) throw error
  revalidatePath('/')
}
