import { redirect, notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProfile } from '@/lib/actions'
import NavBar from '@/components/NavBar'
import ProfileForm from '@/components/ProfileForm'

export default async function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getProfile(username)
  if (!profile) notFound()

  const isOwnProfile = profile.id === user.id
  const viewerProfile = isOwnProfile ? profile : await getProfile(user.id)

  const { data: viewerRow } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  return (
    <div className="min-h-screen flex flex-col">
      <NavBar userId={user.id} username={viewerProfile?.username ?? null} isAdmin={viewerRow?.is_admin ?? false} />
      <main className="flex-1 max-w-xl mx-auto w-full px-4 py-6">
        {isOwnProfile ? (
          <ProfileForm profile={profile} />
        ) : (
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">{profile.display_name}</h1>
            {profile.username && <p className="text-sm text-gray-500">@{profile.username}</p>}
          </div>
        )}
      </main>
    </div>
  )
}
