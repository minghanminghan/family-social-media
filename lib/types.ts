export type PostType = 'text' | 'media' | 'audio' | 'file'
export type MediaType = 'image' | 'video' | 'audio' | 'file'

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  username: string | null
  created_at: string
}

export interface PostMedia {
  id: string
  post_id: string
  position: number
  storage_path: string
  media_type: MediaType
  original_filename: string | null
  created_at: string
}

export interface Post {
  id: string
  author_id: string
  type: PostType
  caption: string | null
  created_at: string
  embedding: number[] | null
  // joined
  author?: Profile
  media?: PostMedia[]
  likes?: { user_id: string; created_at: string; user?: Profile }[]
  comments?: Comment[]
  like_count?: number
  comment_count?: number
  // search-only
  similarity?: number
  text_rank?: number
  is_exact?: boolean
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
  parent_id: string | null
  content: string
  created_at: string
  author?: Profile
}

export interface SearchResult {
  post: Post
  similarity: number
}

export interface AccessRequest {
  id: string
  email: string
  status: 'pending' | 'approved' | 'denied'
  requested_at: string
  decided_at: string | null
  decided_by: string | null
}
