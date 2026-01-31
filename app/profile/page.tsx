import { requireAuthWithProfile } from '@/lib/auth/server'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import SideNav from '@/components/layout/SideNav'

export default async function ProfilePage() {
  const profile = await requireAuthWithProfile()

  // Check if user is admin
  const isAdmin = profile.is_admin || false

  return (
    <div className="min-h-screen bg-warm-cream md:flex">
      <SideNav isAdmin={isAdmin} />

      <div className="flex-1 w-full">
        <header className="bg-deep-charcoal text-warm-cream py-4 px-6 md:px-6 pl-16 md:pl-6">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-2xl font-bold">Profile</h1>
            <p className="text-warm-cream/80 text-sm">Manage your account settings</p>
          </div>
        </header>

        <main className="max-w-4xl mx-auto py-8 px-6">
          <Card className="mb-6">
            <h2 className="text-xl font-bold text-earth-brown mb-4">Personal Information</h2>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-stone-gray">Full Name</p>
                <p className="text-lg font-semibold">{profile.name}</p>
              </div>
              <div>
                <p className="text-sm text-stone-gray">Username</p>
                <p className="text-lg font-semibold">{profile.username}</p>
              </div>
              <div>
                <p className="text-sm text-stone-gray">Email</p>
                <p className="text-lg font-semibold">{profile.email}</p>
              </div>
              <div>
                <p className="text-sm text-stone-gray">Display Preference</p>
                <p className="text-lg font-semibold capitalize">{profile.display_preference?.replace('_', ' ')}</p>
              </div>
            </div>
          </Card>

          <Card className="mb-6">
            <h2 className="text-xl font-bold text-earth-brown mb-4">Status & Certifications</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-stone-gray mb-2">Account Status</p>
                <Badge variant={profile.status === 'assigned' ? 'success' : 'warning'}>
                  {profile.status}
                </Badge>
              </div>
              {profile.leader_certified && (
                <div>
                  <p className="text-sm text-stone-gray mb-2">Certifications</p>
                  <Badge variant="info">Leader Certified</Badge>
                  {profile.leader_certification_date && (
                    <p className="text-sm text-stone-gray mt-1">
                      Certified: {new Date(profile.leader_certification_date).toLocaleDateString()}
                    </p>
                  )}
                </div>
              )}
            </div>
          </Card>

          <Card>
            <h2 className="text-xl font-bold text-earth-brown mb-4">Account Settings</h2>
            <p className="text-sm text-stone-gray">Account settings and preferences coming soon.</p>
          </Card>
        </main>
      </div>
    </div>
  )
}
