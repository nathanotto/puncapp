'use client';

import { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import TaskScreen from '@/components/task/TaskScreen';
import TaskNotAvailable from '@/components/task/TaskNotAvailable';
import { submitRsvp } from './actions';
import { ActionResult } from '@/lib/task-utils';

interface MeetingContext {
  meeting: {
    id: string;
    scheduled_date: string;
    scheduled_time: string;
    location: string;
    rsvp_deadline: string;
    chapter: {
      name: string;
    };
  };
  currentRsvp: {
    rsvp_status: string;
    rsvp_reason: string | null;
  } | null;
  authorized: boolean;
  currentUserName?: string;
  reason?: string;
}

export default function RespondToRsvpPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const meetingId = searchParams.get('meeting');

  const [loading, setLoading] = useState(true);
  const [context, setContext] = useState<MeetingContext | null>(null);
  const [selectedRsvp, setSelectedRsvp] = useState<'yes' | 'no'>('yes');
  const [reason, setReason] = useState('');

  useEffect(() => {
    if (!meetingId) {
      setLoading(false);
      return;
    }

    // Fetch meeting context
    fetch(`/api/meetings/${meetingId}/rsvp-context`)
      .then(res => res.json())
      .then(data => {
        setContext(data);
        if (data.currentRsvp?.rsvp_status && data.currentRsvp.rsvp_status !== 'no_response') {
          setSelectedRsvp(data.currentRsvp.rsvp_status);
          if (data.currentRsvp.rsvp_reason) {
            setReason(data.currentRsvp.rsvp_reason);
          }
        }
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to load meeting context:', err);
        setLoading(false);
      });
  }, [meetingId]);

  const handleExecute = async (): Promise<ActionResult> => {
    if (!meetingId) {
      return {
        success: false,
        message: 'No meeting specified',
        consequence: 'Please select a meeting to RSVP to.',
      };
    }

    return await submitRsvp(meetingId, selectedRsvp, reason);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-warm-cream flex items-center justify-center">
        <p className="text-stone-gray">Loading meeting details...</p>
      </div>
    );
  }

  if (!meetingId || !context) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <TaskNotAvailable
          reason="No meeting specified"
          suggestion={{
            description: 'Return to your dashboard to see your pending tasks.',
            href: '/dashboard',
            label: 'Go to Dashboard',
          }}
        />
      </div>
    );
  }

  if (!context.authorized) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <TaskNotAvailable
          reason={context.reason || 'You are not authorized to RSVP to this meeting'}
          suggestion={{
            description: 'Return to your dashboard.',
            href: '/dashboard',
            label: 'Go to Dashboard',
          }}
        />
      </div>
    );
  }

  const { meeting, currentRsvp } = context;
  // Combine date and time to avoid timezone issues
  const meetingDate = new Date(`${meeting.scheduled_date}T${meeting.scheduled_time}`);
  const rsvpDeadline = meeting.rsvp_deadline ? new Date(meeting.rsvp_deadline) : null;
  const isPastDeadline = rsvpDeadline && new Date() > rsvpDeadline;

  return (
    <TaskScreen
      currentUserName={context.currentUserName}
      prompt={{
        title: 'RSVP to Chapter Meeting',
        subtitle: `${meeting.chapter.name} · ${meetingDate.toLocaleDateString('en-US', {
          weekday: 'long',
          month: 'long',
          day: 'numeric'
        })} at ${meeting.scheduled_time}`,
      }}
      context={
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-earth-brown mb-2">Meeting Details</h3>
            <div className="space-y-1 text-stone-gray">
              <p><strong>Date:</strong> {meetingDate.toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric'
              })}</p>
              <p><strong>Time:</strong> {meeting.scheduled_time}</p>
              <p><strong>Location:</strong> {meeting.location}</p>
              {rsvpDeadline && (
                <p>
                  <strong>RSVP Deadline:</strong> {rsvpDeadline.toLocaleDateString('en-US', {
                    month: 'long',
                    day: 'numeric'
                  })}
                  {isPastDeadline && (
                    <span className="ml-2 text-red-600 font-semibold">(Past deadline)</span>
                  )}
                </p>
              )}
            </div>
          </div>

          {currentRsvp && currentRsvp.rsvp_status !== 'no_response' && (
            <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
              <p className="text-blue-900">
                <strong>Current response:</strong> {currentRsvp.rsvp_status.toUpperCase()}
                {currentRsvp.rsvp_reason && ` - ${currentRsvp.rsvp_reason}`}
              </p>
              <p className="text-blue-700 mt-1">You can update your response below.</p>
            </div>
          )}

          {isPastDeadline && (
            <div className="bg-yellow-50 border border-yellow-200 rounded p-3 text-sm text-yellow-900">
              The RSVP deadline has passed, but you can still submit a late response.
            </div>
          )}

          <div>
            <h3 className="font-semibold text-earth-brown mb-3">Your Response</h3>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="rsvp"
                  value="yes"
                  checked={selectedRsvp === 'yes'}
                  onChange={(e) => setSelectedRsvp('yes')}
                  className="w-5 h-5 text-burnt-orange"
                />
                <span className="text-earth-brown font-medium">Yes, I'll be there</span>
              </label>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="rsvp"
                  value="no"
                  checked={selectedRsvp === 'no'}
                  onChange={(e) => setSelectedRsvp('no')}
                  className="w-5 h-5 text-burnt-orange"
                />
                <span className="text-earth-brown font-medium">No, I can't make it</span>
              </label>

              {selectedRsvp === 'no' && (
                <div className="ml-8 mt-2">
                  <textarea
                    id="reason"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    placeholder="Let your chapter know why you can't attend..."
                    rows={3}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
                    required
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      }
      primaryAction={{
        label: 'Submit RSVP',
        onClick: () => {}, // Handled by TaskScreen
      }}
      secondaryActions={[
        {
          label: 'Cancel',
          onClick: () => router.push('/dashboard'),
          variant: 'secondary',
        },
      ]}
      onExecute={handleExecute}
      isDisabled={selectedRsvp === 'no' && !reason.trim()}
    />
  );
}
