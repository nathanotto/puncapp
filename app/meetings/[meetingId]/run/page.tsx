import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadMeetingRunnerContext } from '@/lib/meeting-runner-context'
import {
  startTimer,
  stopTimer,
  changeScribe,
  advanceSection,
  logLightningRound,
  skipLightningRound,
  logFullCheckin,
  skipFullCheckin,
  addMeetingTime,
  ditchCurriculum,
  submitCurriculumResponse,
  completeCurriculum,
  submitMeetingFeedback,
  saveAudioMetadata,
  completeMeeting
} from './actions'
import { MeetingRunnerClient } from './MeetingRunnerClient'

export default async function MeetingRunnerPage({
  params,
}: {
  params: Promise<{ meetingId: string }>
}) {
  const { meetingId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  // Load context
  const context = await loadMeetingRunnerContext(meetingId, user.id)

  if (!context.authorized) {
    return <div className="p-8 text-center text-red-600">{context.reason}</div>
  }

  const { meeting, attendees, timeLogs, isScribe, meetingEndTime, curriculumModule, curriculumResponses, meetingFeedback, audioRecording } = context

  // Get user data for header
  const { data: userData } = await supabase
    .from('users')
    .select('name, username')
    .eq('id', user.id)
    .single()

  // Format meeting date for header
  const meetingDateTime = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`)
  const meetingDate = meetingDateTime.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  })

  // Get all chapter members
  const { data: allMembers } = await supabase
    .from('chapter_memberships')
    .select(`
      user_id,
      users!chapter_memberships_user_id_fkey(id, name, username)
    `)
    .eq('chapter_id', meeting.chapter_id)
    .eq('is_active', true)

  // Calculate not-checked-in members
  const checkedInUserIds = new Set(attendees.map(a => a.user_id))
  const notCheckedInMembers = allMembers?.filter(m => !checkedInUserIds.has(m.user_id)) || []

  // Fetch stretch goals for all attendees
  const attendeeUserIds = attendees.map(a => a.user_id)
  const { data: stretchGoals } = await supabase
    .from('commitments')
    .select('id, committer_id, description')
    .eq('commitment_type', 'stretch_goal')
    .eq('status', 'active')
    .in('committer_id', attendeeUserIds)

  // Transform to lookup object
  const stretchGoalsByUser: Record<string, { id: string; description: string } | null> = {}
  attendeeUserIds.forEach(userId => {
    const goal = stretchGoals?.find(g => g.committer_id === userId)
    stretchGoalsByUser[userId] = goal ? { id: goal.id, description: goal.description } : null
  })

  // Create async wrapper functions for server actions
  const handleStartTimer = async (userId: string) => {
    'use server'
    await startTimer(meetingId, userId)
  }

  const handleStopTimer = async () => {
    'use server'
    await stopTimer(meetingId)
  }

  const handleChangeScribe = async (newScribeId: string) => {
    'use server'
    await changeScribe(meetingId, newScribeId)
  }

  const handleMeditationComplete = async () => {
    'use server'
    await advanceSection(meetingId, 'opening_ethos')
  }

  const handleEthosComplete = async () => {
    'use server'
    await advanceSection(meetingId, 'lightning_round')
  }

  const handleLightningComplete = async () => {
    'use server'
    console.log('[handleLightningComplete] Called')
    console.log('[handleLightningComplete] About to call advanceSection with:', meetingId, 'full_checkins')
    await advanceSection(meetingId, 'full_checkins')
    console.log('[handleLightningComplete] advanceSection completed')
  }

  const handlePersonComplete = async (
    userId: string,
    durationSeconds: number,
    overtimeSeconds: number,
    priority: number
  ) => {
    'use server'
    await logLightningRound(meetingId, userId, durationSeconds, overtimeSeconds, priority)
  }

  const handlePersonSkip = async (userId: string) => {
    'use server'
    await skipLightningRound(meetingId, userId)
  }

  const handleFullCheckinComplete = async (
    userId: string,
    durationSeconds: number,
    overtimeSeconds: number,
    stretchGoalAction: 'kept' | 'completed' | 'new' | 'none',
    requestedSupport: boolean,
    newStretchGoalText?: string
  ) => {
    'use server'
    await logFullCheckin(
      meetingId,
      userId,
      durationSeconds,
      overtimeSeconds,
      stretchGoalAction,
      requestedSupport,
      newStretchGoalText
    )
  }

  const handleFullCheckinSkip = async (userId: string) => {
    'use server'
    await skipFullCheckin(meetingId, userId)
  }

  const handleAddMeetingTime = async (minutes: number) => {
    'use server'
    await addMeetingTime(meetingId, minutes)
  }

  const handleDitchCurriculum = async () => {
    'use server'
    await ditchCurriculum(meetingId)
  }

  const handleFullCheckinsComplete = async () => {
    'use server'
    const nextSection = meeting.curriculum_ditched ? 'closing' : 'curriculum'
    await advanceSection(meetingId, nextSection)
  }

  const handleSubmitCurriculumResponse = async (response: string) => {
    'use server'
    if (!meeting.selected_curriculum_id) {
      throw new Error('No curriculum module selected')
    }
    await submitCurriculumResponse(meetingId, meeting.selected_curriculum_id, response)
  }

  const handleCurriculumComplete = async () => {
    'use server'
    await completeCurriculum(meetingId)
  }

  const handleSubmitFeedback = async (
    rating: number | null,
    mostValueUserId: string | null,
    skipRating: boolean,
    skipMostValue: boolean
  ) => {
    'use server'
    await submitMeetingFeedback(meetingId, rating, mostValueUserId, skipRating, skipMostValue)
  }

  const handleSaveAudioMetadata = async (storagePath: string) => {
    'use server'
    // File size is not available here, but we can set it to 0 or fetch from storage if needed
    await saveAudioMetadata(meetingId, storagePath, 0)
  }

  const handleCompleteMeeting = async () => {
    'use server'
    await completeMeeting(meetingId)
  }

  return (
    <MeetingRunnerClient
      initialMeeting={meeting}
      initialAttendees={attendees}
      initialNotCheckedIn={notCheckedInMembers}
      initialTimeLogs={timeLogs}
      initialCurriculumModule={curriculumModule}
      initialCurriculumResponses={curriculumResponses}
      initialMeetingFeedback={meetingFeedback}
      initialAudioRecording={audioRecording}
      isScribe={isScribe}
      currentUserId={user.id}
      currentUserName={userData?.username || userData?.name || 'Member'}
      meetingEndTime={meetingEndTime}
      meetingDate={meetingDate}
      stretchGoalsByUser={stretchGoalsByUser}
      onStartTimer={handleStartTimer}
      onStopTimer={handleStopTimer}
      onChangeScribe={handleChangeScribe}
      onMeditationComplete={handleMeditationComplete}
      onEthosComplete={handleEthosComplete}
      onLightningComplete={handleLightningComplete}
      onPersonComplete={handlePersonComplete}
      onPersonSkip={handlePersonSkip}
      onFullCheckinComplete={handleFullCheckinComplete}
      onFullCheckinSkip={handleFullCheckinSkip}
      onAddMeetingTime={handleAddMeetingTime}
      onDitchCurriculum={handleDitchCurriculum}
      onFullCheckinsComplete={handleFullCheckinsComplete}
      onSubmitCurriculumResponse={handleSubmitCurriculumResponse}
      onCurriculumComplete={handleCurriculumComplete}
      onSubmitFeedback={handleSubmitFeedback}
      onSaveAudioMetadata={handleSaveAudioMetadata}
      onCompleteMeeting={handleCompleteMeeting}
    />
  )
}
