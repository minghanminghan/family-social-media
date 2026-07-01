import { createClient } from '@supabase/supabase-js'

// Service-role client for operations that must bypass RLS (checking
// whether an email is already a known user, creating accounts on approval).
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!
  )
}
