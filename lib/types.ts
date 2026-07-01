export type PostType = 'text' | 'image' | 'video' | 'carousel'
export type MediaType = 'image' | 'video'

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  created_at: string
}

export interface PostMedia {
  id: string
  post_id: string
  position: number
  storage_path: string
  media_type: MediaType
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
  likes?: { user_id: string }[]
  comments?: Comment[]
  like_count?: number
  comment_count?: number
}

export interface Comment {
  id: string
  post_id: string
  author_id: string
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
