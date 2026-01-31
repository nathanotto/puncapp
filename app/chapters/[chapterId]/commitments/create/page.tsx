import { createClient } from '@/lib/supabase/server'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { createCommitment } from '@/lib/commitments/actions'

interface PageProps {
  params: Promise<{ chapterId: string }>
}

export default async function CreateCommitmentPage({ params }: PageProps) {
  const { chapterId } = await params
  const profile = await requireAuthWithProfile()
  const supabase = await createClient()

  // Check if user is member of this chapter
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('*, chapters(name)')
    .eq('chapter_id', chapterId)
    .eq('user_id', profile.id)
    .eq('is_active', true)
    .single()

  if (!membership) {
    notFound()
  }

  // Fetch chapter members for "to_member" commitments
  const { data: members } = await supabase
    .from('chapter_memberships')
    .select('user_id, users(id, name, username, display_preference)')
    .eq('chapter_id', chapterId)
    .eq('is_active', true)
    .neq('user_id', profile.id) // Exclude current user

  async function handleCreate(formData: FormData) {
    'use server'

    const commitmentType = formData.get('commitmentType') as 'stretch_goal' | 'to_member' | 'volunteer_activity' | 'help_favor'
    const description = formData.get('description') as string
    const recipientId = formData.get('recipientId') as string || undefined
    const deadline = formData.get('deadline') as string || undefined

    const result = await createCommitment({
      chapterId,
      commitmentType,
      description,
      recipientId,
      deadline,
    })

    if (result.success) {
      redirect(`/chapters/${chapterId}/commitments`)
    } else {
      throw new Error(result.error)
    }
  }

  function getDisplayName(user: any) {
    if (!user) return 'Unknown'
    return user.display_preference === 'real_name' ? user.name : user.username
  }

  return (
    <div className="min-h-screen bg-warm-cream">
      <header className="bg-deep-charcoal text-warm-cream py-6 px-6">
        <div className="max-w-4xl mx-auto">
          <Link href={`/chapters/${chapterId}/commitments`} className="text-sm text-warm-cream/80 hover:text-warm-cream mb-2 inline-block">
            ← Back to Commitments
          </Link>
          <h1 className="text-3xl font-bold">Create New Commitment</h1>
          <p className="text-warm-cream/80 text-sm mt-1">{membership.chapters?.name}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6">
        <Card>
          <form action={handleCreate}>
            <div className="space-y-6">
              {/* Commitment Type */}
              <div>
                <label htmlFor="commitmentType" className="block text-sm font-semibold text-earth-brown mb-2">
                  Commitment Type *
                </label>
                <select
                  id="commitmentType"
                  name="commitmentType"
                  required
                  className="w-full px-4 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-burnt-orange bg-white"
                >
                  <option value="stretch_goal">Stretch Goal - Personal challenge to report back on</option>
                  <option value="to_member">To Another Member - Promise to help a specific brother</option>
                  <option value="volunteer_activity">Volunteer Activity - Service to the community</option>
                  <option value="help_favor">Help/Favor - Assistance needed from chapter</option>
                </select>
                <p className="text-xs text-stone-gray mt-1">
                  Choose the type of commitment you're making
                </p>
              </div>

              {/* Description */}
              <div>
                <label htmlFor="description" className="block text-sm font-semibold text-earth-brown mb-2">
                  Description *
                </label>
                <textarea
                  id="description"
                  name="description"
                  required
                  rows={4}
                  placeholder="Describe what you're committing to do..."
                  className="w-full px-4 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-burnt-orange resize-none"
                />
                <p className="text-xs text-stone-gray mt-1">
                  Be specific about what you'll do and how you'll know when it's done
                </p>
              </div>

              {/* Recipient (for "to_member" type) */}
              <div>
                <label htmlFor="recipientId" className="block text-sm font-semibold text-earth-brown mb-2">
                  To Which Member? (Optional - only for "To Another Member" type)
                </label>
                <select
                  id="recipientId"
                  name="recipientId"
                  className="w-full px-4 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-burnt-orange bg-white"
                >
                  <option value="">None - Not to a specific member</option>
                  {members?.map(member => (
                    <option key={member.user_id} value={member.user_id}>
                      {getDisplayName(member.users)}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-stone-gray mt-1">
                  If this commitment is to help a specific brother, select their name. They'll be able to confirm when you complete it.
                </p>
              </div>

              {/* Deadline */}
              <div>
                <label htmlFor="deadline" className="block text-sm font-semibold text-earth-brown mb-2">
                  Deadline (Optional)
                </label>
                <input
                  type="date"
                  id="deadline"
                  name="deadline"
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-burnt-orange"
                />
                <p className="text-xs text-stone-gray mt-1">
                  Set a target date to complete this commitment
                </p>
              </div>

              {/* Helper Text */}
              <div className="p-4 bg-warm-cream rounded-md">
                <h3 className="font-semibold text-sm text-earth-brown mb-2">What makes a good commitment?</h3>
                <ul className="space-y-1 text-sm text-stone-gray">
                  <li className="flex items-start">
                    <span className="text-burnt-orange mr-2">•</span>
                    <span><strong>Specific:</strong> "Call my dad this weekend" not "be a better son"</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-burnt-orange mr-2">•</span>
                    <span><strong>Achievable:</strong> Something you can actually do in the timeframe</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-burnt-orange mr-2">•</span>
                    <span><strong>Meaningful:</strong> Pushes you out of your comfort zone or serves others</span>
                  </li>
                  <li className="flex items-start">
                    <span className="text-burnt-orange mr-2">•</span>
                    <span><strong>Reportable:</strong> You can share the outcome at the next meeting</span>
                  </li>
                </ul>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-6">
                <Button type="submit" variant="primary" size="large">
                  Create Commitment
                </Button>
                <Link href={`/chapters/${chapterId}/commitments`}>
                  <Button type="button" variant="secondary" size="large">
                    Cancel
                  </Button>
                </Link>
              </div>
            </div>
          </form>
        </Card>
      </main>
    </div>
  )
}
