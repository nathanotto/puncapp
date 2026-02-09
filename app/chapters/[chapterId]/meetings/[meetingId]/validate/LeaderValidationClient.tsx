'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Meeting = {
  id: string;
  scheduled_start: string;
  duration_minutes: number;
  completed_at: string;
  chapter?: { name: string };
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
};

type Props = {
  meeting: Meeting;
  attendance: Attendance[];
  timeLogs: TimeLog[];
  curriculumHistory?: CurriculumHistory | null;
  feedback: Feedback[];
  recording?: Recording | null;
};

export default function LeaderValidationClient({
  meeting,
  attendance,
  timeLogs,
  curriculumHistory,
  feedback,
  recording,
}: Props) {
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const checkedInCount = attendance.filter(a => a.checked_in_at).length;
  const lateCount = attendance.filter(a => a.is_late).length;

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

  const handleSubmit = async () => {
    if (!acknowledged) {
      alert('Please check the acknowledgment box');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`/api/meetings/${meeting.id}/validate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (!res.ok) throw new Error('Failed to validate meeting');

      router.push(`/meetings/${meeting.id}/summary`);
      router.refresh();
    } catch (error) {
      console.error('Validation error:', error);
      alert('Failed to validate meeting');
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Meeting Summary Card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Meeting Summary</h2>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Attendance</p>
            <p className="text-lg font-semibold">{checkedInCount}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Duration</p>
            <p className="text-lg font-semibold">{meeting.duration_minutes} min</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Average Rating</p>
            <p className="text-lg font-semibold">{avgRating} / 10</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Overtime</p>
            <p className="text-lg font-semibold">
              {totalOvertime > 0 ? `${Math.round(totalOvertime / 60)} min` : 'None'}
            </p>
          </div>
        </div>

        {lateCount > 0 && (
          <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded">
            <p className="text-sm text-amber-800">
              ⚠️ {lateCount} {lateCount === 1 ? 'person' : 'people'} arrived late
            </p>
          </div>
        )}
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
              </div>
              <div className="text-sm text-gray-600">
                {a.attendance_type} • {new Date(a.checked_in_at).toLocaleTimeString()}
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
        </div>
      </div>

      {/* Curriculum */}
      {curriculumHistory?.module && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Curriculum</h2>
          <div>
            <h3 className="font-medium">{curriculumHistory.module.title}</h3>
            <p className="text-sm text-blue-600 italic mt-1">
              {curriculumHistory.module.principle}
            </p>
          </div>
        </div>
      )}

      {/* Feedback Summary */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Feedback Summary</h2>
        <div className="space-y-3">
          <div>
            <p className="text-sm text-gray-600">Rating Distribution</p>
            <div className="flex gap-2 mt-2">
              {ratings.length > 0 ? (
                ratings.map((f, idx) => (
                  <span key={idx} className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-sm">
                    {f.value_rating}/10
                  </span>
                ))
              ) : (
                <p className="text-sm text-gray-500">No ratings submitted</p>
              )}
            </div>
          </div>

          <div>
            <p className="text-sm text-gray-600">Most Value Selections</p>
            <div className="flex flex-wrap gap-2 mt-2">
              {feedback.filter(f => !f.skipped_rating && f.most_value_user).length > 0 ? (
                feedback
                  .filter(f => f.most_value_user)
                  .map((f, idx) => (
                    <span key={idx} className="px-2 py-1 bg-green-100 text-green-700 rounded text-sm">
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

      {/* Recording */}
      {recording && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Recording</h2>
          <p className="text-sm text-gray-600">
            File size: {(recording.file_size_bytes / (1024 * 1024)).toFixed(2)} MB
          </p>
          <p className="text-sm text-gray-600 mt-1">Path: {recording.storage_path}</p>
        </div>
      )}

      {/* Validation Section */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h2 className="text-xl font-semibold mb-4">Leader Validation</h2>

        <div className="space-y-4">
          <div className="bg-white p-4 rounded border border-blue-200">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={acknowledged}
                onChange={(e) => setAcknowledged(e.target.checked)}
                className="mt-1 rounded"
              />
              <span className="text-sm">
                <strong>I formally acknowledge that this meeting took place as described here.</strong>
                <br />
                <span className="text-gray-600">
                  This includes attendance, duration, curriculum completion, and all recorded activities.
                </span>
              </span>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Additional Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              rows={3}
              placeholder="Any additional comments or context..."
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={!acknowledged || submitting}
            className="w-full px-4 py-3 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {submitting ? 'Submitting...' : 'Submit Validation'}
          </button>

          <p className="text-xs text-gray-600 text-center">
            After validation, this meeting will be sent to Admin for final approval
          </p>
        </div>
      </div>
    </div>
  );
}
