import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'

export default async function ChapterMeetingsPage({
  params,
}: {
  params: Promise<{ chapterId: string }>
}) {
  const { chapterId } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  // Get chapter info
  const { data: chapter } = await supabase
    .from('chapters')
    .select('name')
    .eq('id', chapterId)
    .single()

  // Get all meetings for this chapter
  const { data: meetings } = await supabase
    .from('meetings')
    .select('id, scheduled_date, scheduled_time, status, completed_at')
    .eq('chapter_id', chapterId)
    .order('scheduled_date', { ascending: false })
    .order('scheduled_time', { ascending: false })

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold text-earth-brown mb-6">
        {chapter?.name} - Meetings
      </h1>

      {!meetings || meetings.length === 0 ? (
        <p className="text-stone-gray">No meetings found for this chapter.</p>
      ) : (
        <div className="space-y-4">
          {meetings.map((meeting) => {
            const date = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`)
            const dateStr = date.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
              year: 'numeric'
            })

            return (
              <Link
                key={meeting.id}
                href={`/meetings/${meeting.id}`}
                className="block bg-white rounded-lg p-6 shadow hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-semibold text-earth-brown mb-1">
                      {dateStr}
                    </h3>
                    <p className="text-sm text-stone-gray">
                      {meeting.scheduled_time}
                    </p>
                  </div>
                  <div>
                    <span
                      className={`px-3 py-1 rounded text-sm font-medium ${
                        meeting.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : meeting.status === 'in_progress'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {meeting.status === 'completed'
                        ? 'Completed'
                        : meeting.status === 'in_progress'
                        ? 'In Progress'
                        : 'Scheduled'}
                    </span>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
