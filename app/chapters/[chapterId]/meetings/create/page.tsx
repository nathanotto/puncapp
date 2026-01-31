import { createClient } from '@/lib/supabase/server'
import { requireAuthWithProfile } from '@/lib/auth/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import Card from '@/components/ui/Card'
import Button from '@/components/ui/Button'
import { createMeeting } from '@/lib/meetings/actions'

interface PageProps {
  params: Promise<{ chapterId: string }>
}

export default async function CreateMeetingPage({ params }: PageProps) {
  const { chapterId } = await params
  const profile = await requireAuthWithProfile()
  const supabase = await createClient()

  // Check if user is a leader of this chapter
  const { data: role } = await supabase
    .from('chapter_roles')
    .select('role_type, chapters(name)')
    .eq('chapter_id', chapterId)
    .eq('user_id', profile.id)
    .in('role_type', ['Chapter Leader', 'Backup Leader'])
    .single()

  if (!role) {
    notFound()
  }

  // Fetch available curriculum modules
  const { data: modules } = await supabase
    .from('curriculum_modules')
    .select('id, title, description')
    .order('title')

  async function handleCreateMeeting(formData: FormData) {
    'use server'

    const date = formData.get('date') as string
    const time = formData.get('time') as string
    const scheduledDatetime = `${date}T${time}:00`

    const result = await createMeeting({
      chapterId,
      scheduledDatetime,
      location: {
        street: formData.get('street') as string,
        city: formData.get('city') as string,
        state: formData.get('state') as string,
        zip: formData.get('zip') as string,
      },
      topic: formData.get('topic') as string || undefined,
      curriculumModuleId: formData.get('curriculumModuleId') as string || undefined,
    })

    if (result.success) {
      redirect(`/chapters/${chapterId}/meetings`)
    } else {
      // In a real app, we'd handle this error better
      throw new Error(result.error)
    }
  }

  return (
    <div className="min-h-screen bg-warm-cream">
      <header className="bg-deep-charcoal text-warm-cream py-6 px-6">
        <div className="max-w-4xl mx-auto">
          <Link href={`/chapters/${chapterId}/meetings`} className="text-sm text-warm-cream/80 hover:text-warm-cream mb-2 inline-block">
            ← Back to Meetings
          </Link>
          <h1 className="text-3xl font-bold">Schedule New Meeting</h1>
          <p className="text-warm-cream/80 text-sm mt-1">{role.chapters?.name}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-12 px-6">
        <Card>
          <form action={handleCreateMeeting}>
            <div className="space-y-6">
              {/* Date and Time */}
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label htmlFor="date" className="block text-sm font-semibold text-earth-brown mb-2">
                    Date *
                  </label>
                  <input
                    type="date"
                    id="date"
                    name="date"
                    required
                    min={new Date().toISOString().split('T')[0]}
                    className="w-full px-4 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-burnt-orange"
                  />
                </div>

                <div>
                  <label htmlFor="time" className="block text-sm font-semibold text-earth-brown mb-2">
                    Time *
                  </label>
                  <input
                    type="time"
                    id="time"
                    name="time"
                    required
                    className="w-full px-4 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-burnt-orange"
                  />
                </div>
              </div>

              {/* Topic */}
              <div>
                <label htmlFor="topic" className="block text-sm font-semibold text-earth-brown mb-2">
                  Meeting Topic
                </label>
                <input
                  type="text"
                  id="topic"
                  name="topic"
                  placeholder="e.g., Weekly Chapter Meeting, Special Topic Discussion"
                  className="w-full px-4 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-burnt-orange"
                />
                <p className="text-xs text-stone-gray mt-1">Optional - defaults to "Chapter Meeting"</p>
              </div>

              {/* Curriculum Module */}
              <div>
                <label htmlFor="curriculumModuleId" className="block text-sm font-semibold text-earth-brown mb-2">
                  Curriculum Module
                </label>
                <select
                  id="curriculumModuleId"
                  name="curriculumModuleId"
                  className="w-full px-4 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-burnt-orange bg-white"
                >
                  <option value="">None - General Meeting</option>
                  {modules?.map(module => (
                    <option key={module.id} value={module.id}>
                      {module.title}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-stone-gray mt-1">Optional - Select a curriculum module for this meeting</p>
              </div>

              {/* Location */}
              <div className="pt-4 border-t border-border-light">
                <h3 className="text-lg font-semibold text-earth-brown mb-4">Meeting Location</h3>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="street" className="block text-sm font-semibold text-earth-brown mb-2">
                      Street Address *
                    </label>
                    <input
                      type="text"
                      id="street"
                      name="street"
                      required
                      placeholder="123 Main Street"
                      className="w-full px-4 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-burnt-orange"
                    />
                  </div>

                  <div className="grid md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <label htmlFor="city" className="block text-sm font-semibold text-earth-brown mb-2">
                        City *
                      </label>
                      <input
                        type="text"
                        id="city"
                        name="city"
                        required
                        placeholder="Springfield"
                        className="w-full px-4 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-burnt-orange"
                      />
                    </div>

                    <div>
                      <label htmlFor="state" className="block text-sm font-semibold text-earth-brown mb-2">
                        State *
                      </label>
                      <input
                        type="text"
                        id="state"
                        name="state"
                        required
                        placeholder="IL"
                        maxLength={2}
                        className="w-full px-4 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-burnt-orange"
                      />
                    </div>

                    <div>
                      <label htmlFor="zip" className="block text-sm font-semibold text-earth-brown mb-2">
                        ZIP Code *
                      </label>
                      <input
                        type="text"
                        id="zip"
                        name="zip"
                        required
                        placeholder="62701"
                        maxLength={5}
                        pattern="[0-9]{5}"
                        className="w-full px-4 py-2 border border-border-light rounded-md focus:outline-none focus:ring-2 focus:ring-burnt-orange"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-6">
                <Button type="submit" variant="primary" size="large">
                  Schedule Meeting
                </Button>
                <Link href={`/chapters/${chapterId}/meetings`}>
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
