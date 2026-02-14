'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ScheduleMeetingModal } from '@/components/chapter/ScheduleMeetingModal'

interface Meeting {
  id: string
  scheduled_date: string
  scheduled_time: string
  status: string
  completed_at: string | null
  topic: string | null
  meeting_type: string | null
}

interface ChapterMeetingsClientProps {
  chapterId: string
  chapterName: string
  defaultLocation: string
  isLeader: boolean
  meetings: Meeting[]
}

export function ChapterMeetingsClient({
  chapterId,
  chapterName,
  defaultLocation,
  isLeader,
  meetings,
}: ChapterMeetingsClientProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)

  return (
    <div className="p-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-earth-brown">
          {chapterName} - Meetings
        </h1>

        {isLeader && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="px-6 py-3 bg-burnt-orange text-white rounded-lg font-semibold hover:bg-deep-charcoal transition-colors"
          >
            Schedule A Meeting
          </button>
        )}
      </div>

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

            // Link to summary page for completed meetings, detail page for others
            const meetingHref = meeting.status === 'completed'
              ? `/meetings/${meeting.id}/summary`
              : `/meetings/${meeting.id}`

            return (
              <Link
                key={meeting.id}
                href={meetingHref}
                className="block bg-white rounded-lg p-6 shadow hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-earth-brown">
                        {dateStr}
                      </h3>
                      {meeting.meeting_type === 'special_consideration' && (
                        <span className="px-2 py-0.5 bg-purple-100 text-purple-800 text-xs font-medium rounded">
                          Special
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-stone-gray">
                      {meeting.scheduled_time}
                    </p>
                    {meeting.topic && (
                      <p className="text-sm text-stone-gray mt-1">
                        {meeting.topic}
                      </p>
                    )}
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

      <ScheduleMeetingModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        chapterId={chapterId}
        chapterName={chapterName}
        defaultLocation={defaultLocation}
      />
    </div>
  )
}
