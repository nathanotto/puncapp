'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Meeting = {
  id: string;
  scheduled_start: string;
  duration_minutes: number;
  completed_at: string;
  leader_validated_at: string;
  leader_validation_notes?: string;
  chapter?: { id: string; name: string };
  leader?: { id: string; name: string };
  scribe?: { id: string; name: string };
};

type Attendance = {
  user_id: string;
  checked_in_at: string;
  attendance_type: string;
  is_late: boolean;
  user?: { id: string; name: string };
};

type TimeLog = {
  section: string;
  user_id?: string;
  start_time: string;
  end_time?: string;
  duration_seconds: number;
  overtime_seconds: number;
  skipped: boolean;
  user?: { id: string; name: string };
};

type CurriculumHistory = {
  module?: { id: string; title: string; principle: string };
};

type CurriculumResponse = {
  user_id: string;
  response: string;
  user?: { id: string; name: string };
};

type Feedback = {
  value_rating?: number;
  skipped_rating: boolean;
  most_value_user_id?: string;
  user?: { id: string; name: string };
  most_value_user?: { id: string; name: string };
};

type Recording = {
  storage_path: string;
  file_size_bytes: number;
  duration_seconds?: number;
};

type Props = {
  meeting: Meeting;
  attendance: Attendance[];
  rsvpCount: number;
  timeLogs: TimeLog[];
  curriculumHistory?: CurriculumHistory | null;
  curriculumResponses: CurriculumResponse[];
  feedback: Feedback[];
  recording?: Recording | null;
  adminUserId: string;
};

export default function AdminValidationClient({
  meeting,
  attendance,
  rsvpCount,
  timeLogs,
  curriculumHistory,
  curriculumResponses,
  feedback,
  recording,
  adminUserId,
}: Props) {
  const router = useRouter();
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const checkedInCount = attendance.length;
  const lateCount = attendance.filter(a => a.is_late).length;
  const startedLate = lateCount > 0;

  // Calculate average rating
  const ratings = feedback.filter(f => !f.skipped_rating && f.value_rating);
  const avgRating = ratings.length > 0
    ? (ratings.reduce((sum, f) => sum + (f.value_rating || 0), 0) / ratings.length).toFixed(1)
    : 'N/A';

  // Calculate total overtime
  const totalOvertime = timeLogs.reduce((sum, log) => sum + (log.overtime_seconds || 0), 0);

  // Group time logs by section
  const sectionLogs = timeLogs.filter(log => !log.user_id);
  const userLogs = timeLogs.filter(log => log.user_id);

  const handleApprove = async () => {
    if (!confirm('Approve this meeting? It will be counted for donor reporting.')) {
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/meetings/${meeting.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'approve',
          notes: notes || null,
          admin_user_id: adminUserId,
        }),
      });

      if (!res.ok) throw new Error('Failed to approve meeting');

      router.push('/admin/validation');
      router.refresh();
    } catch (error) {
      console.error('Approval error:', error);
      alert('Failed to approve meeting');
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!notes.trim()) {
      alert('Please provide notes explaining why this meeting is being rejected.');
      return;
    }

    if (!confirm('Reject this meeting? It will be marked as unfundable.')) {
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/admin/meetings/${meeting.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reject',
          notes,
          admin_user_id: adminUserId,
        }),
      });

      if (!res.ok) throw new Error('Failed to reject meeting');

      router.push('/admin/validation');
      router.refresh();
    } catch (error) {
      console.error('Rejection error:', error);
      alert('Failed to reject meeting');
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Content (2/3) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Summary Card */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Meeting Summary</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Attendance</p>
              <p className="text-lg font-semibold">
                {checkedInCount} / {rsvpCount}
              </p>
              <p className="text-xs text-gray-500">checked in / RSVP'd yes</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Duration</p>
              <p className="text-lg font-semibold">{meeting.duration_minutes} min</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Average Rating</p>
              <p className="text-lg font-semibold">{avgRating} / 10</p>
              <p className="text-xs text-gray-500">({ratings.length} responses)</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Started Late</p>
              <p className="text-lg font-semibold">{startedLate ? 'Yes' : 'No'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Overtime</p>
              <p className="text-lg font-semibold">
                {totalOvertime > 0 ? `${Math.round(totalOvertime / 60)} min` : 'None'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Curriculum</p>
              <p className="text-sm font-semibold">
                {curriculumHistory?.module?.title || 'None'}
              </p>
            </div>
          </div>
        </div>

        {/* Attendance List */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Attendance</h2>
          <div className="space-y-2">
            {attendance.map(a => (
              <div key={a.user_id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{a.user?.name}</span>
                  {a.is_late && (
                    <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                      Late
                    </span>
                  )}
                  <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded">
                    {a.attendance_type}
                  </span>
                </div>
                <div className="text-sm text-gray-600">
                  {new Date(a.checked_in_at).toLocaleTimeString()}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Time Breakdown */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Time Breakdown</h2>

          <div className="space-y-4">
            <div>
              <h3 className="font-medium mb-2">Section Times</h3>
              <div className="space-y-1">
                {sectionLogs.map((log, idx) => {
                  const duration = log.duration_seconds
                    ? Math.round(log.duration_seconds / 60)
                    : log.end_time
                    ? Math.round((new Date(log.end_time).getTime() - new Date(log.start_time).getTime()) / 60000)
                    : 0;

                  return (
                    <div key={idx} className="flex justify-between text-sm p-2 bg-gray-50 rounded">
                      <span className="capitalize">{log.section.replace(/_/g, ' ')}</span>
                      <span>{duration} min</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {userLogs.length > 0 && (
              <div>
                <h3 className="font-medium mb-2">Individual Times</h3>
                <div className="space-y-1 text-sm">
                  {userLogs.map((log, idx) => (
                    <div key={idx} className="flex justify-between p-2 bg-gray-50 rounded">
                      <span>
                        {log.user?.name} ({log.section.replace(/_/g, ' ')})
                        {log.skipped && <span className="text-gray-500 ml-1">(skipped)</span>}
                      </span>
                      <span>
                        {Math.round(log.duration_seconds / 60)} min
                        {log.overtime_seconds > 0 && (
                          <span className="text-amber-600 ml-1">
                            +{Math.round(log.overtime_seconds / 60)}
                          </span>
                        )}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {totalOvertime > 0 && (
              <div className="pt-2 border-t border-gray-200">
                <div className="flex justify-between font-semibold">
                  <span>Total Overtime Used</span>
                  <span className="text-amber-600">{Math.round(totalOvertime / 60)} min</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Curriculum Responses */}
        {curriculumHistory?.module && curriculumResponses.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Curriculum Responses</h2>
            <div className="mb-4">
              <h3 className="font-medium">{curriculumHistory.module.title}</h3>
              <p className="text-sm text-blue-600 italic">{curriculumHistory.module.principle}</p>
            </div>
            <div className="space-y-3">
              {curriculumResponses.map((resp, idx) => (
                <div key={idx} className="p-3 bg-gray-50 rounded">
                  <p className="font-medium text-sm mb-1">{resp.user?.name}</p>
                  <p className="text-sm text-gray-700">{resp.response}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Feedback Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Feedback Summary</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600 mb-2">Rating Distribution</p>
              <div className="flex flex-wrap gap-2">
                {ratings.length > 0 ? (
                  ratings.map((f, idx) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-700 rounded font-medium">
                      {f.value_rating}/10
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No ratings submitted</p>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm text-gray-600 mb-2">Most Value Selections</p>
              <div className="flex flex-wrap gap-2">
                {feedback.filter(f => f.most_value_user).length > 0 ? (
                  feedback
                    .filter(f => f.most_value_user)
                    .map((f, idx) => (
                      <span key={idx} className="px-3 py-1 bg-green-100 text-green-700 rounded font-medium">
                        {f.most_value_user?.name}
                      </span>
                    ))
                ) : (
                  <p className="text-sm text-gray-500">No selections</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Leader Validation */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Leader Validation</h2>
          <div className="space-y-2">
            <div>
              <p className="text-sm text-gray-600">Leader</p>
              <p className="font-medium">{meeting.leader?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Validated At</p>
              <p className="font-medium">
                {new Date(meeting.leader_validated_at).toLocaleDateString()} at{' '}
                {new Date(meeting.leader_validated_at).toLocaleTimeString()}
              </p>
            </div>
            {meeting.leader_validation_notes && (
              <div>
                <p className="text-sm text-gray-600">Leader Notes</p>
                <p className="text-sm bg-gray-50 p-3 rounded">{meeting.leader_validation_notes}</p>
              </div>
            )}
          </div>
        </div>

        {/* Recording */}
        {recording && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold mb-4">Recording</h2>
            <div className="space-y-2">
              <div>
                <p className="text-sm text-gray-600">File Size</p>
                <p className="font-medium">{(recording.file_size_bytes / (1024 * 1024)).toFixed(2)} MB</p>
              </div>
              {recording.duration_seconds && (
                <div>
                  <p className="text-sm text-gray-600">Duration</p>
                  <p className="font-medium">{Math.round(recording.duration_seconds / 60)} min</p>
                </div>
              )}
              <div>
                <p className="text-sm text-gray-600">Storage Path</p>
                <p className="text-sm font-mono bg-gray-50 p-2 rounded break-all">
                  {recording.storage_path}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Validation Actions Sidebar (1/3) */}
      <div className="lg:col-span-1">
        <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-8">
          <h2 className="text-xl font-semibold mb-4">Validation Decision</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Admin Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                rows={4}
                placeholder="Optional notes for approval, required for rejection..."
              />
            </div>

            <div className="space-y-2">
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="w-full px-4 py-3 bg-green-600 text-white rounded font-medium hover:bg-green-700 disabled:bg-gray-400"
              >
                {submitting ? 'Processing...' : 'Approve Meeting'}
              </button>

              <button
                onClick={handleReject}
                disabled={submitting}
                className="w-full px-4 py-3 border-2 border-red-600 text-red-600 rounded font-medium hover:bg-red-50 disabled:opacity-50"
              >
                {submitting ? 'Processing...' : 'Reject Meeting'}
              </button>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-600">
                <strong>Approved meetings</strong> are counted for donor reporting and considered fundable.
              </p>
              <p className="text-xs text-gray-600 mt-2">
                <strong>Rejected meetings</strong> are marked unfundable and will not be counted in reports.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
