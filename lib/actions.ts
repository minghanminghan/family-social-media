'use server'

import { revalidatePath } from 'next/cache'
import { after } from 'next/server'
import { createClient } from './supabase/server'
import { createAdminClient } from './supabase/admin'
import { MediaType, PostType } from './types'
import { TYPE_MEDIA_KINDS } from './mediaKinds'

// ── Auth ──────────────────────────────────────────────────────────────────

function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export async function sendOtp(email: string) {
  const normalizedEmail = normalizeEmail(email)
  const admin = createAdminClient()

  // Only known (i.e. previously approved) emails ever get a sign-in code.
  // ilike is case-insensitive but treats % and _ as wildcards, so escape
  // them first — otherwise an email like "%" would match every profile.
  const escapedEmail = normalizedEmail.replace(/[%_\\]/g, '\\$&')
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .ilike('email', escapedEmail)
    .maybeSingle()

  if (!existing) {
    const { error } = await admin
      .from('access_requests')
      .upsert(
        { email: normalizedEmail, status: 'pending', decided_at: null, decided_by: null },
        { onConflict: 'email' }
      )
    if (error) return { error: error.message }
    return { error: null, pending: true }
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithOtp({ email: normalizedEmail })
  if (error) return { error: error.message }
  return { error: null, pending: false }
}

export async function verifyOtp(email: string, token: string) {
  const supabase = await createClient()
  const { error } = await supabase.auth.verifyOtp({ email: normalizeEmail(email), token, type: 'email' })
  if (error) return { error: error.message }
  return { error: null }
}

// ── Admin ──────────────────────────────────────────────────────────────────

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) throw new Error('Forbidden')
  return user
}

export async function getAccessRequests() {
  await requireAdmin()
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('access_requests')
    .select('*')
    .order('requested_at', { ascending: false })

  if (error) throw error
  return data
}

export async function approveAccessRequest(requestId: string) {
  const admin = await requireAdmin()
  const supabase = await createClient()

  const { data: request, error: fetchError } = await supabase
    .from('access_requests')
    .select('email, status')
    .eq('id', requestId)
    .single()
  if (fetchError) throw fetchError
  if (request.status !== 'pending') return

  const adminClient = createAdminClient()
  const { error: createError } = await adminClient.auth.admin.createUser({
    email: request.email,
    email_confirm: false,
  })
  if (createError) throw createError

  const { error } = await supabase
    .from('access_requests')
    .update({ status: 'approved', decided_at: new Date().toISOString(), decided_by: admin.id })
    .eq('id', requestId)
  if (error) throw error

  revalidatePath('/admin/requests')
}

export async function denyAccessRequest(requestId: string) {
  const admin = await requireAdmin()
  const supabase = await createClient()

  const { error } = await supabase
    .from('access_requests')
    .update({ status: 'denied', decided_at: new Date().toISOString(), decided_by: admin.id })
    .eq('id', requestId)
  if (error) throw error

  revalidatePath('/admin/requests')
}

// ── Posts ──────────────────────────────────────────────────────────────────

// Post creation is split into three steps because large files (video,
// multi-slide carousels) are uploaded directly from the browser to Supabase
// Storage rather than through this server action — Next.js Server Actions
// and Vercel's function payload limit both cap request bodies well below
// what a video upload needs. The client:
//   1. createPost        — inserts the post row, returns its id
//   2. (browser uploads each file straight to Storage under that post id)
//   3. attachPostMedia    — records the uploaded paths as post_media rows
//   4. finalizePost       — kicks off embedding once media rows (if any) exist
export async function createPost(type: PostType, caption: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { data: post, error } = await supabase
    .from('posts')
    .insert({ author_id: user.id, type, caption: caption?.trim() || null })
    .select()
    .single()

  if (error) throw error
  return post
}

export async function attachPostMedia(
  postId: string,
  items: { storage_path: string; media_type: MediaType; original_filename: string | null }[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { data: post, error: postError } = await supabase
    .from('posts')
    .select('type, author_id')
    .eq('id', postId)
    .single()
  if (postError) throw postError
  if (post.author_id !== user.id) throw new Error('Forbidden')

  // The client picks the storage path it uploads to, so re-check it actually
  // landed under this user's own post prefix (matching the storage RLS
  // policy) rather than trusting an arbitrary client-supplied path — e.g. a
  // path pointing at another post's already-public media.
  const allowedKinds = TYPE_MEDIA_KINDS[post.type as PostType]
  const expectedPrefix = `${user.id}/${postId}/`
  const rows = items.map((item, i) => {
    if (!item.storage_path.startsWith(expectedPrefix)) {
      throw new Error('Invalid storage path')
    }
    if (!allowedKinds.includes(item.media_type)) {
      throw new Error(`File "${item.original_filename ?? item.storage_path}" doesn't match post type "${post.type}"`)
    }
    return {
      post_id: postId,
      position: i,
      storage_path: item.storage_path,
      media_type: item.media_type,
      original_filename: item.original_filename,
    }
  })

  const { error } = await supabase.from('post_media').insert(rows)
  if (error) throw error
}

export async function finalizePost(postId: string) {
  // Post (with file contents already stored) is ready to render immediately.
  // Embedding runs after the response is sent, so it never blocks the post
  // from showing up on refresh; /api/embed upserts the embedding back in
  // once Modal responds. Modal fetches media by public URL rather than
  // receiving bytes here, so it needs no changes for direct browser uploads.
  after(() =>
    fetch(`${process.env.NEXT_PUBLIC_APP_URL}/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-embed-secret': process.env.EMBED_SECRET! },
      body: JSON.stringify({ post_id: postId }),
    }).catch(err => console.error('Embed kickoff failed', err))
  )

  revalidatePath('/')
}

export async function editPost(postId: string, caption: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase
    .from('posts')
    .update({ caption: caption.trim() || null })
    .eq('id', postId)
    .eq('author_id', user.id)

  if (error) throw error
  revalidatePath('/')
  revalidatePath(`/post/${postId}`)
}

export async function deletePost(postId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  // Storage paths must be read before the row (and its post_media rows,
  // via ON DELETE CASCADE) are gone.
  const { data: media } = await supabase
    .from('post_media')
    .select('storage_path')
    .eq('post_id', postId)

  const { data: deleted, error } = await supabase
    .from('posts')
    .delete()
    .eq('id', postId)
    .eq('author_id', user.id)
    .select('id')

  if (error) throw error
  // Zero rows means the post didn't exist or wasn't owned by this user —
  // bail out without touching storage so a non-owner can't trigger deletion
  // of someone else's media by calling deletePost on their post id.
  if (!deleted || deleted.length === 0) throw new Error('Post not found')

  if (media && media.length > 0) {
    const { error: removeError } = await supabase.storage
      .from('media')
      .remove(media.map(m => m.storage_path))
    if (removeError) console.error(`Failed to remove storage for post ${postId}`, removeError)
  }

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

export async function createComment(postId: string, content: string, parentId?: string | null) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  if (parentId) {
    const { data: parent } = await supabase.from('comments').select('post_id').eq('id', parentId).single()
    if (!parent || parent.post_id !== postId) throw new Error('Invalid parent comment')
  }

  const { error } = await supabase
    .from('comments')
    .insert({ post_id: postId, author_id: user.id, content, parent_id: parentId ?? null })

  if (error) throw error
  revalidatePath(`/post/${postId}`)
  revalidatePath('/')
}

export async function editComment(commentId: string, postId: string, content: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthenticated')

  const { error } = await supabase
    .from('comments')
    .update({ content: content.trim() })
    .eq('id', commentId)
    .eq('author_id', user.id)

  if (error) throw error
  revalidatePath('/')
  revalidatePath(`/post/${postId}`)
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
