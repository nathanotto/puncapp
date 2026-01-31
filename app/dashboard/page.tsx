import { requireAuthWithProfile } from '@/lib/auth/server'
import { redirect } from 'next/navigation'
import Card from '@/components/ui/Card'
import Badge from '@/components/ui/Badge'
import Button from '@/components/ui/Button'
import { signOut } from '@/lib/auth/client'

export default async function DashboardPage() {
  const profile = await requireAuthWithProfile()

  return (
    <div className="min-h-screen bg-warm-cream">
      {/* Header */}
      <header className="bg-deep-charcoal text-warm-cream py-6 px-6">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">
              {profile.display_preference === 'real_name' ? profile.name : profile.username}
            </h1>
            <p className="text-warm-cream/80 text-sm">
              {profile.status === 'unassigned' ? 'Not yet in a chapter' : 'Chapter Member'}
            </p>
          </div>
          <form action={async () => {
            'use server'
            const { createClient } = await import('@/lib/supabase/server')
            const supabase = await createClient()
            await supabase.auth.signOut()
            redirect('/auth/signin')
          }}>
            <Button type="submit" variant="secondary" size="small">
              Sign Out
            </Button>
          </form>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-6xl mx-auto py-12 px-6">
        {/* Status Badge */}
        <div className="mb-8">
          {profile.status === 'unassigned' && (
            <Badge variant="warning">Unassigned - No Chapter Yet</Badge>
          )}
          {profile.status === 'assigned' && (
            <Badge variant="success">Active Chapter Member</Badge>
          )}
          {profile.leader_certified && (
            <Badge variant="info" className="ml-2">Leader Certified</Badge>
          )}
        </div>

        {/* Welcome Message */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-earth-brown mb-4">
            Welcome to PUNC Chapters
          </h2>
          <p className="text-lg text-stone-gray">
            Your chapter management dashboard. This is where you'll see your upcoming meetings, commitments, and chapter information.
          </p>
        </div>

        {/* Profile Card */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card>
            <h3 className="text-xl font-semibold mb-4">Your Profile</h3>
            <dl className="space-y-3">
              <div>
                <dt className="text-sm font-semibold text-stone-gray">Name</dt>
                <dd className="text-base">{profile.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-stone-gray">Username</dt>
                <dd className="text-base">@{profile.username}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-stone-gray">Email</dt>
                <dd className="text-base">{profile.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-stone-gray">Phone</dt>
                <dd className="text-base">{profile.phone}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-stone-gray">Address</dt>
                <dd className="text-base">{profile.address}</dd>
              </div>
              <div>
                <dt className="text-sm font-semibold text-stone-gray">Display Preference</dt>
                <dd className="text-base capitalize">{profile.display_preference.replace('_', ' ')}</dd>
              </div>
            </dl>
          </Card>

          <Card>
            <h3 className="text-xl font-semibold mb-4">Getting Started</h3>
            <div className="space-y-4">
              {profile.status === 'unassigned' ? (
                <>
                  <p className="text-stone-gray">
                    You're not yet in a chapter. Here's what you can do:
                  </p>
                  <ul className="space-y-2 text-stone-gray">
                    <li className="flex items-start">
                      <span className="text-burnt-orange mr-2">•</span>
                      <span>Search for existing chapters near you</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-burnt-orange mr-2">•</span>
                      <span>Join a forming chapter in your area</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-burnt-orange mr-2">•</span>
                      <span>Request a new chapter to be formed</span>
                    </li>
                  </ul>
                  <Button variant="primary" fullWidth disabled>
                    Find Chapters (Coming Soon)
                  </Button>
                </>
              ) : (
                <>
                  <p className="text-stone-gray">
                    You're all set! Features coming soon:
                  </p>
                  <ul className="space-y-2 text-stone-gray">
                    <li className="flex items-start">
                      <span className="text-burnt-orange mr-2">•</span>
                      <span>View upcoming meetings</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-burnt-orange mr-2">•</span>
                      <span>RSVP to meetings</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-burnt-orange mr-2">•</span>
                      <span>Track your commitments</span>
                    </li>
                    <li className="flex items-start">
                      <span className="text-burnt-orange mr-2">•</span>
                      <span>View chapter members</span>
                    </li>
                  </ul>
                </>
              )}
            </div>
          </Card>
        </div>

        {/* Feature Placeholder Cards */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="opacity-50">
            <h3 className="text-xl font-semibold mb-2">Upcoming Meetings</h3>
            <p className="text-sm text-stone-gray">No meetings scheduled yet</p>
          </Card>

          <Card className="opacity-50">
            <h3 className="text-xl font-semibold mb-2">My Commitments</h3>
            <p className="text-sm text-stone-gray">No commitments yet</p>
          </Card>

          <Card className="opacity-50">
            <h3 className="text-xl font-semibold mb-2">Curriculum Progress</h3>
            <p className="text-sm text-stone-gray">Not started</p>
          </Card>
        </div>
      </main>
    </div>
  )
}
