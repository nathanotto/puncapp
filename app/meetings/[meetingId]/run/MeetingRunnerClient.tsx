'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { normalizeJoin } from '@/lib/supabase/utils'
import { OpeningSection } from '@/components/meeting/OpeningSection'
import { LightningRound } from '@/components/meeting/LightningRound'
import { FullCheckinSection } from '@/components/meeting/FullCheckinSection'
import { CurriculumSection } from '@/components/meeting/CurriculumSection'
import { ClosingSection } from '@/components/meeting/ClosingSection'
import { TimeLeft } from './TimeLeft'

interface MeetingRunnerClientProps {
  initialMeeting: any
  initialAttendees: any[]
  initialNotCheckedIn: any[]
  initialTimeLogs: any[]
  initialCurriculumModule: any
  initialCurriculumResponses: any[]
  initialMeetingFeedback: any[]
  initialAudioRecording: any
  isScribe: boolean
  currentUserId: string
  currentUserName: string
  meetingEndTime: Date
  meetingDate: string
  stretchGoalsByUser: Record<string, { id: string; description: string } | null>
  onStartTimer: (userId: string) => Promise<void>
  onStopTimer: () => Promise<void>
  onChangeScribe: (newScribeId: string) => Promise<void>
  onMeditationComplete: () => Promise<void>
  onEthosComplete: () => Promise<void>
  onLightningComplete: () => Promise<void>
  onPersonComplete: (userId: string, durationSeconds: number, overtimeSeconds: number, priority: number) => Promise<void>
  onPersonSkip: (userId: string) => Promise<void>
  onFullCheckinComplete: (userId: string, durationSeconds: number, overtimeSeconds: number, stretchGoalAction: 'kept' | 'completed' | 'new' | 'none', requestedSupport: boolean, newStretchGoalText?: string) => Promise<void>
  onFullCheckinSkip: (userId: string) => Promise<void>
  onAddMeetingTime: (minutes: number) => Promise<void>
  onDitchCurriculum: () => Promise<void>
  onFullCheckinsComplete: () => Promise<void>
  onSubmitCurriculumResponse: (response: string) => Promise<void>
  onAcceptAssignment: (dueDate: string) => Promise<void>
  onCurriculumComplete: () => Promise<void>
  onSubmitFeedback: (rating: number | null, mostValueUserId: string | null, skipRating: boolean, skipMostValue: boolean) => Promise<void>
  onSaveAudioMetadata: (storagePath: string) => Promise<void>
  onCompleteMeeting: () => Promise<void>
}

export function MeetingRunnerClient({
  initialMeeting,
  initialAttendees,
  initialNotCheckedIn,
  initialTimeLogs,
  initialCurriculumModule,
  initialCurriculumResponses,
  initialMeetingFeedback,
  initialAudioRecording,
  isScribe,
  currentUserId,
  currentUserName,
  meetingEndTime,
  meetingDate,
  stretchGoalsByUser,
  onStartTimer,
  onStopTimer,
  onChangeScribe,
  onMeditationComplete,
  onEthosComplete,
  onLightningComplete,
  onPersonComplete,
  onPersonSkip,
  onFullCheckinComplete,
  onFullCheckinSkip,
  onAddMeetingTime,
  onDitchCurriculum,
  onFullCheckinsComplete,
  onSubmitCurriculumResponse,
  onAcceptAssignment,
  onCurriculumComplete,
  onSubmitFeedback,
  onSaveAudioMetadata,
  onCompleteMeeting,
}: MeetingRunnerClientProps) {
  const [meeting, setMeeting] = useState(initialMeeting)
  const [attendees, setAttendees] = useState(initialAttendees)
  const [notCheckedInMembers, setNotCheckedInMembers] = useState(initialNotCheckedIn || [])
  const [timeLogs, setTimeLogs] = useState(initialTimeLogs)
  const [curriculumResponses, setCurriculumResponses] = useState(initialCurriculumResponses)
  const [meetingFeedback, setMeetingFeedback] = useState(initialMeetingFeedback)
  const [audioRecording, setAudioRecording] = useState(initialAudioRecording)

  // Track if current user is the scribe (can change dynamically)
  const [currentIsScribe, setCurrentIsScribe] = useState(isScribe)

  // Track toast notification for scribe changes
  const [scribeChangeToast, setScribeChangeToast] = useState<string | null>(null)
  const [previousScribeId, setPreviousScribeId] = useState(meeting.scribe_id)

  const supabase = createClient()

  console.log('MeetingRunnerClient rendered, meeting.id:', meeting.id)
  console.log('Current user is scribe:', currentIsScribe)

  // Fetch fresh attendance data
  const fetchAttendanceData = async () => {
    console.log('📡 Fetching updated attendance data...')

    // Get checked-in attendees
    const { data: attendanceList } = await supabase
      .from('attendance')
      .select(`
        *,
        user:users!attendance_user_id_fkey(id, name, username)
      `)
      .eq('meeting_id', meeting.id)
      .not('checked_in_at', 'is', null)

    if (attendanceList) {
      console.log('✅ Updated attendance:', attendanceList.length, 'checked in')
      setAttendees(attendanceList)
    }

    // Get not-checked-in members
    const { data: allMembers } = await supabase
      .from('chapter_memberships')
      .select(`
        user_id,
        users!chapter_memberships_user_id_fkey(id, name, username)
      `)
      .eq('chapter_id', meeting.chapter_id)
      .eq('is_active', true)

    if (allMembers && attendanceList) {
      const checkedInUserIds = new Set(attendanceList.map(a => a.user_id))
      const notCheckedIn = allMembers.filter(m => !checkedInUserIds.has(m.user_id))
      console.log('✅ Not checked in:', notCheckedIn.length, 'members')
      setNotCheckedInMembers(notCheckedIn)
    }
  }

  // Fetch fresh time logs
  const fetchTimeLogs = async () => {
    console.log('📡 Fetching updated time logs...')
    const { data: logs } = await supabase
      .from('meeting_time_log')
      .select('*')
      .eq('meeting_id', meeting.id)
      .order('start_time', { ascending: true })

    if (logs) {
      setTimeLogs(logs)
    }
  }

  // Fetch fresh meeting data
  const fetchMeetingData = async () => {
    console.log('📡 Fetching updated meeting data...')
    const { data: meetingData } = await supabase
      .from('meetings')
      .select(`
        *,
        chapter:chapters!inner(id, name),
        scribe:users!meetings_scribe_id_fkey(id, name, username)
      `)
      .eq('id', meeting.id)
      .single()

    if (meetingData) {
      console.log('📡 Received meeting data, scribe_id:', meetingData.scribe_id)

      // Check if scribe changed
      if (meetingData.scribe_id !== previousScribeId) {
        console.log('🔄 Scribe changed from', previousScribeId, 'to', meetingData.scribe_id)
        const newScribeName = meetingData.scribe?.username || meetingData.scribe?.name || 'Someone'

        if (meetingData.scribe_id === currentUserId) {
          // Current user became the scribe
          console.log('✅ Current user is now scribe')
          setScribeChangeToast('You are now the Scribe')
        } else if (previousScribeId === currentUserId) {
          // Current user was the scribe but no longer
          console.log('❌ Current user is no longer scribe')
          setScribeChangeToast(`${newScribeName} is now the Scribe`)
        } else {
          // Neither - just watching
          console.log('👀 Watching scribe change')
          setScribeChangeToast(`${newScribeName} is now the Scribe`)
        }

        setPreviousScribeId(meetingData.scribe_id)

        // Clear toast after 5 seconds
        setTimeout(() => setScribeChangeToast(null), 5000)
      }

      // Always update meeting state with fresh data
      setMeeting(meetingData)

      // Update scribe status based on fresh data
      const newIsScribe = meetingData.scribe_id === currentUserId
      if (newIsScribe !== currentIsScribe) {
        console.log('🔄 Updating currentIsScribe from', currentIsScribe, 'to', newIsScribe)
        setCurrentIsScribe(newIsScribe)
      }
    }
  }

  // Fetch fresh curriculum responses
  const fetchCurriculumResponses = async () => {
    console.log('📡 Fetching updated curriculum responses...')
    const { data: responses } = await supabase
      .from('curriculum_responses')
      .select('user_id, response')
      .eq('meeting_id', meeting.id)

    if (responses) {
      setCurriculumResponses(responses)
    }
  }

  // Fetch fresh meeting feedback
  const fetchMeetingFeedback = async () => {
    console.log('📡 Fetching updated meeting feedback...')
    const { data: feedback } = await supabase
      .from('meeting_feedback')
      .select('user_id, value_rating, most_value_user_id, skipped_rating, skipped_most_value')
      .eq('meeting_id', meeting.id)

    if (feedback) {
      setMeetingFeedback(feedback)
    }
  }

  // Fetch audio recording
  const fetchAudioRecording = async () => {
    console.log('📡 Fetching updated audio recording...')
    const { data: recording } = await supabase
      .from('meeting_recordings')
      .select('storage_path, recorded_by')
      .eq('meeting_id', meeting.id)
      .maybeSingle()

    setAudioRecording(recording)
  }

  // Real-time subscription
  useEffect(() => {
    console.log('🔴 Setting up real-time subscriptions for meeting:', meeting.id)

    const channel = supabase
      .channel(`meeting-runner-${meeting.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'attendance',
          filter: `meeting_id=eq.${meeting.id}`,
        },
        (payload) => {
          console.log('📡 Attendance change detected:', payload)
          fetchAttendanceData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'meetings',
          filter: `id=eq.${meeting.id}`,
        },
        (payload) => {
          console.log('📡 Meeting change detected:', payload)
          fetchMeetingData()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_time_log',
          filter: `meeting_id=eq.${meeting.id}`,
        },
        (payload) => {
          console.log('📡 Time log change detected:', payload)
          fetchTimeLogs()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'curriculum_responses',
          filter: `meeting_id=eq.${meeting.id}`,
        },
        (payload) => {
          console.log('📡 Curriculum response change detected:', payload)
          fetchCurriculumResponses()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_feedback',
          filter: `meeting_id=eq.${meeting.id}`,
        },
        (payload) => {
          console.log('📡 Meeting feedback change detected:', payload)
          fetchMeetingFeedback()
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'meeting_recordings',
          filter: `meeting_id=eq.${meeting.id}`,
        },
        (payload) => {
          console.log('📡 Audio recording change detected:', payload)
          fetchAudioRecording()
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log('✅ Real-time subscription active for meeting:', meeting.id)
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Real-time subscription error for meeting:', meeting.id)
          if (err) console.error('Error details:', err)
          console.log('💡 Note: Updates may still work. Check if real-time changes are being detected.')
        } else if (status === 'CLOSED') {
          console.log('⚠️ Subscription closed for meeting:', meeting.id)
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Subscription timed out for meeting:', meeting.id)
        } else {
          console.log('⚠️ Subscription status:', status, 'for meeting:', meeting.id)
        }
      })

    return () => {
      console.log('🔴 Cleaning up real-time subscriptions')
      supabase.removeChannel(channel)
    }
  }, [meeting.id])

  // Calculate lightning and full checkin logs
  const lightningLogs = timeLogs
    ?.filter(l => l.section === 'lightning_round' && l.user_id)
    .map(l => ({
      user_id: l.user_id!,
      duration_seconds: l.duration_seconds || 0,
      overtime_seconds: l.overtime_seconds || 0,
      priority: l.priority,
      skipped: l.skipped || false,
    })) || []

  const fullCheckinLogs = timeLogs
    ?.filter(l => l.section === 'full_checkins' && l.user_id)
    .map(l => ({
      user_id: l.user_id!,
      duration_seconds: l.duration_seconds || 0,
      overtime_seconds: l.overtime_seconds || 0,
      skipped: l.skipped || false,
      stretch_goal_action: l.stretch_goal_action,
      requested_support: l.requested_support || false,
    })) || []

  return (
    <div className="min-h-screen bg-warm-cream">
      {/* Toast Notification */}
      {scribeChangeToast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 bg-sage-green text-deep-charcoal px-6 py-4 rounded-lg shadow-xl font-semibold text-lg border-2 border-deep-charcoal animate-fade-in">
          🎯 {scribeChangeToast}
        </div>
      )}

      {/* Header */}
      <header className="bg-deep-charcoal text-warm-cream py-6 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="flex justify-between items-start mb-4">
            <Link href={`/meetings/${meeting.id}`} className="text-sm text-warm-cream/80 hover:text-warm-cream">
              ← Back to Meeting
            </Link>
            <div className="text-right text-sm">
              <p className="text-warm-cream/80">{currentUserName}</p>
              <Link href="/auth/logout" className="text-warm-cream/60 hover:text-warm-cream">
                Sign Out
              </Link>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">{meeting.chapter.name} Meeting</h1>
          <p className="text-warm-cream/80">{meetingDate} at {meeting.scheduled_time}</p>
        </div>
      </header>

      <main className="max-w-4xl mx-auto py-8 px-6">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-2">
            <div>
              <h2 className="text-2xl font-bold">Meeting in Progress</h2>
              {currentIsScribe ? (
                <p className="text-sm text-sage-green font-semibold">🎯 You are the Scribe - You have control</p>
              ) : (
                <p className="text-sm text-blue-600 font-semibold">👀 Viewing only - {meeting.scribe?.username || meeting.scribe?.name || 'No scribe'} has control</p>
              )}
            </div>
            <p className="text-lg font-semibold">Current Phase: {formatPhase(meeting.current_section)}</p>
          </div>
        <div className="flex gap-6">
          <div>
            <p className="text-sm text-gray-500">Scribe</p>
            <p className="text-xl font-bold text-sage-green">
              {meeting.scribe?.username || meeting.scribe?.name || 'Not assigned'}
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Time Left</p>
            <p className="text-xl font-mono font-bold text-orange-600">
              <TimeLeft endTime={meetingEndTime} />
            </p>
          </div>
          <div>
            <p className="text-sm text-gray-500">End Time</p>
            <p className="text-xl font-mono font-bold">{formatTime(meetingEndTime)}</p>
          </div>
        </div>

        {/* Switch Scribe (Scribe only) */}
        {currentIsScribe && (
          <div className="mt-4 p-4 bg-sage-green/10 border border-sage-green rounded-lg">
            <label className="block text-sm font-semibold text-earth-brown mb-2">
              Switch Scribe role to:
            </label>
            <select
              className="w-full p-2 border border-stone-gray rounded-lg"
              value=""
              onChange={async (e) => {
                if (e.target.value && e.target.value !== meeting.scribe_id) {
                  console.log('🔄 Switching scribe from', meeting.scribe_id, 'to', e.target.value)

                  // Optimistically disable controls immediately to prevent race condition
                  setCurrentIsScribe(false)

                  try {
                    await onChangeScribe(e.target.value)
                    console.log('✅ Scribe switch successful, real-time will sync')
                  } catch (error) {
                    console.error('❌ Failed to switch scribe:', error)
                    // Revert on error
                    setCurrentIsScribe(true)
                  }
                }
              }}
            >
              <option value="">Select a new scribe...</option>
              {attendees.filter(a => a.user_id !== meeting.scribe_id).map(a => (
                <option key={a.user_id} value={a.user_id}>
                  {a.user.username || a.user.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Attendance Status */}
      <div className="mb-6 grid grid-cols-2 gap-4">
        {/* Present Attendees */}
        <div className="bg-green-50 rounded-lg border-2 border-green-200 p-4">
          <h3 className="text-sm font-semibold text-green-900 mb-3">
            ✓ Present ({attendees.length})
          </h3>
          <div className="space-y-2">
            {attendees.length === 0 ? (
              <p className="text-sm text-green-700 italic">No one present yet</p>
            ) : (
              attendees.map((attendee) => (
                <div key={attendee.user_id} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-green-900">{attendee.user.name}</span>
                  <span className="text-xs text-green-700">
                    ({attendee.attendance_type === 'in_person' ? 'In Person' : 'Video'})
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Not Present Members */}
        <div className="bg-orange-50 rounded-lg border-2 border-orange-200 p-4">
          <h3 className="text-sm font-semibold text-orange-900 mb-3">
            ⏳ Not Present ({notCheckedInMembers?.length || 0})
          </h3>
          <div className="space-y-2">
            {!notCheckedInMembers || notCheckedInMembers.length === 0 ? (
              <p className="text-sm text-orange-700 italic">Everyone is here!</p>
            ) : (
              notCheckedInMembers.map((member) => {
                const user = normalizeJoin(member.users);
                return (
                <div key={member.user_id} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full border-2 border-orange-400 flex-shrink-0"></div>
                  <span className="text-sm text-orange-900">{user?.name}</span>
                </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {/* Meeting Phase Progress */}
      <div className="mb-8 bg-gray-50 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Phases</h3>
        <div className="space-y-2">
          {[
            { key: 'opening_meditation', label: 'Opening' },
            { key: 'opening_ethos', label: 'Ethos' },
            { key: 'lightning_round', label: 'Lightning Round' },
            { key: 'full_checkins', label: 'Check-ins' },
            { key: 'curriculum', label: 'Curriculum' },
            { key: 'closing', label: 'Close' },
          ].map((section) => {
            const sectionIndex = ['not_started', 'opening_meditation', 'opening_ethos', 'lightning_round', 'full_checkins', 'curriculum', 'closing', 'ended'].indexOf(section.key)
            const currentIndex = ['not_started', 'opening_meditation', 'opening_ethos', 'lightning_round', 'full_checkins', 'curriculum', 'closing', 'ended'].indexOf(meeting.current_section)

            const isComplete = currentIndex > sectionIndex
            const isCurrent = meeting.current_section === section.key ||
              (section.key === 'opening_meditation' && ['not_started', 'opening_meditation'].includes(meeting.current_section))
            const isPending = currentIndex < sectionIndex

            return (
              <div
                key={section.key}
                className={`flex items-center gap-3 p-3 rounded ${
                  isCurrent ? 'bg-blue-100 border-2 border-blue-400' :
                  isComplete ? 'bg-green-50' :
                  'bg-white'
                }`}
              >
                <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                  isComplete ? 'border-green-500 bg-green-500' :
                  isCurrent ? 'border-blue-500 bg-blue-500' :
                  'border-gray-300'
                }`}>
                  {isComplete ? (
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isCurrent ? (
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  ) : null}
                </div>
                <span className={`font-medium ${
                  isCurrent ? 'text-blue-900' :
                  isComplete ? 'text-green-700' :
                  'text-gray-500'
                }`}>
                  {section.label}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Section content */}
      {(meeting.current_section === 'opening_meditation' ||
        meeting.current_section === 'opening_ethos' ||
        meeting.current_section === 'not_started') && (
        <OpeningSection
          isScribe={currentIsScribe}
          currentSection={meeting.current_section}
          onMeditationComplete={onMeditationComplete}
          onEthosComplete={onEthosComplete}
        />
      )}

      {meeting.current_section === 'lightning_round' && (
        <LightningRound
          attendees={attendees}
          isScribe={currentIsScribe}
          completedLogs={lightningLogs}
          currentTimerUserId={meeting.current_timer_user_id}
          currentTimerStart={meeting.current_timer_start}
          onStartTimer={onStartTimer}
          onStopTimer={onStopTimer}
          onPersonComplete={onPersonComplete}
          onPersonSkip={onPersonSkip}
          onRoundComplete={onLightningComplete}
        />
      )}

      {meeting.current_section === 'full_checkins' && (
        <FullCheckinSection
          meetingId={meeting.id}
          attendees={attendees}
          lightningLogs={lightningLogs}
          fullCheckinLogs={fullCheckinLogs}
          meetingEndTime={meetingEndTime}
          isScribe={currentIsScribe}
          curriculumDitched={meeting.curriculum_ditched || false}
          stretchGoalsByUser={stretchGoalsByUser}
          currentTimerUserId={meeting.current_timer_user_id}
          currentTimerStart={meeting.current_timer_start}
          onStartTimer={onStartTimer}
          onStopTimer={onStopTimer}
          onPersonComplete={onFullCheckinComplete}
          onPersonSkip={onFullCheckinSkip}
          onAddMeetingTime={onAddMeetingTime}
          onDitchCurriculum={onDitchCurriculum}
          onRoundComplete={onFullCheckinsComplete}
        />
      )}

      {meeting.current_section === 'curriculum' && (
        <>
          {console.log('Rendering CurriculumSection with responses:', curriculumResponses)}
          <CurriculumSection
            module={initialCurriculumModule}
            attendees={attendees.map(a => ({
              user_id: a.user_id,
              name: a.user.name,
              username: a.user.username
            }))}
            responses={curriculumResponses}
            currentUserId={currentUserId}
            isScribe={currentIsScribe}
            meetingId={meeting.id}
            meetingDate={meetingDate}
            onSubmitResponse={onSubmitCurriculumResponse}
            onAcceptAssignment={onAcceptAssignment}
            onComplete={onCurriculumComplete}
          />
        </>
      )}

      {meeting.current_section === 'closing' && (
        <ClosingSection
          meetingId={meeting.id}
          attendees={attendees.map(a => ({
            user_id: a.user_id,
            name: a.user.name,
            username: a.user.username
          }))}
          feedback={meetingFeedback}
          audioRecording={audioRecording}
          currentUserId={currentUserId}
          isScribe={currentIsScribe}
          onSubmitFeedback={onSubmitFeedback}
          onSaveAudioMetadata={onSaveAudioMetadata}
          onCompleteMeeting={onCompleteMeeting}
        />
      )}
      </main>
    </div>
  )
}

function formatPhase(section: string): string {
  if (section === 'not_started' || section === 'opening_meditation') return 'Opening'
  if (section === 'opening_ethos') return 'Ethos'
  if (section === 'lightning_round') return 'Lightning Round'
  if (section === 'full_checkins') return 'Check-ins'
  if (section === 'curriculum') return 'Curriculum'
  if (section === 'closing') return 'Close'
  if (section === 'ended') return 'Ended'
  return section
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  })
}
