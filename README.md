family social media (private)

## features

- posts: text, photo, video, album (carousel)
- likes, comments, share
- text-to-speech (Web Speech API, browser-side)
- semantic search via CLIP embeddings + pgvector

## stack

- **Frontend:** Next.js (App Router) on Vercel
- **Database / storage / auth:** Supabase (Postgres + pgvector + file storage)
- **Embeddings:** Modal worker — CLIP ViT-B/32 for text, images, video keyframes

## setup

1. Copy `.env.local.example` → `.env.local` and fill in values
2. Run `supabase/migrations/001_init.sql` in Supabase SQL editor
3. Deploy Modal worker: `modal deploy modal/embed.py`, copy endpoint URLs to `.env.local`
4. `npm run dev`

## structure

```
app/          Next.js pages + API routes
components/   React UI components
lib/          Supabase clients, types, server actions
modal/        Python CLIP worker (Modal)
supabase/     DB migration
```
