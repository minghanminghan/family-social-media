import { MediaType, PostType } from './types'

// Storage path/media_type are derived from this whitelist rather than the
// client-supplied filename or File.type directly, since both are attacker-
// controlled and were previously used unsanitized to build the storage path.
// Shared between the browser (which now uploads directly to Supabase
// Storage) and the server actions (which re-validate before recording the
// upload), so both sides agree on what's a valid attachment.
export const MIME_TO_MEDIA: Record<string, { ext: string; kind: MediaType }> = {
  'image/jpeg': { ext: 'jpg', kind: 'image' },
  'image/png': { ext: 'png', kind: 'image' },
  'image/webp': { ext: 'webp', kind: 'image' },
  'image/gif': { ext: 'gif', kind: 'image' },
  'image/heic': { ext: 'heic', kind: 'image' },
  'video/mp4': { ext: 'mp4', kind: 'video' },
  'video/quicktime': { ext: 'mov', kind: 'video' },
  'video/webm': { ext: 'webm', kind: 'video' },
  'audio/mpeg': { ext: 'mp3', kind: 'audio' },
  'audio/mp4': { ext: 'm4a', kind: 'audio' },
  'audio/wav': { ext: 'wav', kind: 'audio' },
  'audio/x-wav': { ext: 'wav', kind: 'audio' },
  'audio/ogg': { ext: 'ogg', kind: 'audio' },
  'audio/webm': { ext: 'weba', kind: 'audio' },
  'audio/aac': { ext: 'aac', kind: 'audio' },
  'application/pdf': { ext: 'pdf', kind: 'file' },
  'text/plain': { ext: 'txt', kind: 'file' },
  'text/markdown': { ext: 'md', kind: 'file' },
  'application/zip': { ext: 'zip', kind: 'file' },
  'application/x-zip-compressed': { ext: 'zip', kind: 'file' },
}

// Some browsers report no MIME type (or a generic one) for .txt/.md files.
// Fall back to the file extension only for those two, still mapping through
// the whitelist above rather than trusting the client-supplied name as-is.
const EXT_FALLBACK: Record<string, string> = {
  '.md': 'text/markdown',
  '.txt': 'text/plain',
}

export function resolveMedia(file: File) {
  if (MIME_TO_MEDIA[file.type]) return MIME_TO_MEDIA[file.type]
  const name = file.name.toLowerCase()
  const fallbackExt = Object.keys(EXT_FALLBACK).find(ext => name.endsWith(ext))
  return fallbackExt ? MIME_TO_MEDIA[EXT_FALLBACK[fallbackExt]] : undefined
}

// Which media kinds each post type is allowed to attach, so a post created
// as e.g. "audio" can't end up with an image attachment that the UI has no
// renderer for.
export const TYPE_MEDIA_KINDS: Record<PostType, MediaType[]> = {
  text: [],
  media: ['image', 'video'],
  audio: ['audio'],
  file: ['file'],
}

export function postTypeForKind(kind: MediaType): PostType {
  if (kind === 'image' || kind === 'video') return 'media'
  return kind
}
