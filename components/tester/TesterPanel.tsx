'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';

interface TesterPanelProps {
  user: {
    id: string;
    is_tester: boolean;
    is_punc_admin: boolean;
  };
  currentChapter?: {
    id: string;
    name: string;
  };
  currentMeeting?: {
    id: string;
    status: string;
    scheduled_date: string;
    scheduled_time: string;
  };
  userRole?: string;
}

export function TesterPanel({
  user,
  currentChapter,
  currentMeeting,
  userRole
}: TesterPanelProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string | null>(null);
  const pathname = usePathname();

  if (!user.is_tester) return null;

  async function runSeedState(state: string) {
    if (!confirm(`Reset database to "${state}" state? This will delete all current data.`)) {
      return;
    }

    setIsLoading(true);
    setLastResult(null);

    try {
      const res = await fetch('/api/tester/seed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ state }),
      });

      const data = await res.json();
      setLastResult(data.success ? `✓ Reset to ${state}` : `✗ ${data.error}`);

      if (data.success) {
        // Reload page to reflect new state
        window.location.reload();
      }
    } catch (error) {
      setLastResult(`✗ Failed: ${error}`);
    }

    setIsLoading(false);
  }

  async function shiftMeetingDate(offset: string) {
    if (!currentMeeting) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/tester/shift-meeting', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: currentMeeting.id,
          offset
        }),
      });

      const data = await res.json();
      setLastResult(data.success ? `✓ Meeting moved to ${data.newDate}` : `✗ ${data.error}`);

      if (data.success) {
        window.location.reload();
      }
    } catch (error) {
      setLastResult(`✗ Failed: ${error}`);
    }
    setIsLoading(false);
  }

  async function runEscalationCheck() {
    setIsLoading(true);
    try {
      const res = await fetch('/api/tester/run-escalation', { method: 'POST' });
      const data = await res.json();
      setLastResult(
        data.success
          ? `✓ ${data.reminders} reminders, ${data.leaderTasks} leader tasks`
          : `✗ ${data.error}`
      );
    } catch (error) {
      setLastResult(`✗ Failed: ${error}`);
    }
    setIsLoading(false);
  }

  async function resetPasswords() {
    if (!confirm('Reset all test user passwords to "testpass123"? (Except your account)')) {
      return;
    }

    setIsLoading(true);
    setLastResult(null);

    try {
      const res = await fetch('/api/tester/reset-passwords', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      const data = await res.json();
      setLastResult(
        data.success
          ? `✓ Reset ${data.successCount} passwords`
          : `✗ ${data.error}`
      );
    } catch (error) {
      setLastResult(`✗ Failed: ${error}`);
    }

    setIsLoading(false);
  }

  async function changeRole(newRole: string) {
    if (!currentChapter) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/tester/change-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chapterId: currentChapter.id,
          newRole
        }),
      });

      const data = await res.json();
      setLastResult(data.success ? `✓ Role changed to ${newRole}` : `✗ ${data.error}`);

      if (data.success) {
        window.location.reload();
      }
    } catch (error) {
      setLastResult(`✗ Failed: ${error}`);
    }
    setIsLoading(false);
  }

  async function simulateCheckin(durationSeconds: number) {
    if (!currentMeeting) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/tester/simulate-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: currentMeeting.id,
          durationSeconds
        }),
      });

      const data = await res.json();
      setLastResult(data.success ? `✓ Check-in logged (${durationSeconds}s)` : `✗ ${data.error}`);

      if (data.success) {
        window.location.reload();
      }
    } catch (error) {
      setLastResult(`✗ Failed: ${error}`);
    }
    setIsLoading(false);
  }

  async function skipToSection(section: string) {
    if (!currentMeeting) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/tester/skip-to-section', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: currentMeeting.id,
          section,
          generateData: true
        }),
      });

      const data = await res.json();
      setLastResult(data.success ? `✓ Skipped to ${section}` : `✗ ${data.error}`);

      if (data.success) {
        window.location.reload();
      }
    } catch (error) {
      setLastResult(`✗ Failed: ${error}`);
    }
    setIsLoading(false);
  }

  async function completeCurriculum() {
    // Extract meeting ID from pathname if on /run page
    const meetingId = currentMeeting?.id || pathname.match(/\/meetings\/([^/]+)/)?.[1];

    if (!meetingId) {
      setLastResult('✗ Not on a meeting page');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/tester/complete-curriculum', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meetingId
        }),
      });

      const data = await res.json();
      setLastResult(data.success ? `✓ Completed curriculum (${data.count} responses)` : `✗ ${data.error}`);

      if (data.success) {
        window.location.reload();
      }
    } catch (error) {
      setLastResult(`✗ Failed: ${error}`);
    }
    setIsLoading(false);
  }

  async function completeFeedback() {
    // Extract meeting ID from pathname if on /run page
    const meetingId = currentMeeting?.id || pathname.match(/\/meetings\/([^/]+)/)?.[1];

    if (!meetingId) {
      setLastResult('✗ Not on a meeting page');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/tester/complete-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meetingId
        }),
      });

      const data = await res.json();
      setLastResult(data.success ? `✓ Completed feedback (${data.count} responses)` : `✗ ${data.error}`);

      if (data.success) {
        window.location.reload();
      }
    } catch (error) {
      setLastResult(`✗ Failed: ${error}`);
    }
    setIsLoading(false);
  }

  async function accelerateLightning() {
    const meetingId = currentMeeting?.id || pathname.match(/\/meetings\/([^/]+)/)?.[1];

    if (!meetingId) {
      setLastResult('✗ Not on a meeting page');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/tester/accelerate-lightning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meetingId
        }),
      });

      const data = await res.json();
      setLastResult(data.success ? `✓ Lightning round completed (${data.count} people)` : `✗ ${data.error}`);

      if (data.success) {
        window.location.reload();
      }
    } catch (error) {
      setLastResult(`✗ Failed: ${error}`);
    }
    setIsLoading(false);
  }

  async function accelerateCheckins() {
    const meetingId = currentMeeting?.id || pathname.match(/\/meetings\/([^/]+)/)?.[1];

    if (!meetingId) {
      setLastResult('✗ Not on a meeting page');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('/api/tester/accelerate-checkins', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId: meetingId
        }),
      });

      const data = await res.json();
      setLastResult(data.success ? `✓ Checkins completed (${data.count} people)` : `✗ ${data.error}`);

      if (data.success) {
        window.location.reload();
      }
    } catch (error) {
      setLastResult(`✗ Failed: ${error}`);
    }
    setIsLoading(false);
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle button */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="absolute -top-2 -left-2 w-8 h-8 bg-purple-600 text-white rounded-full text-xs font-bold shadow-lg hover:bg-purple-700"
      >
        {isExpanded ? '−' : '🧪'}
      </button>

      {isExpanded && (
        <div className="bg-purple-900 text-white rounded-lg shadow-2xl w-80 text-sm overflow-hidden">
          {/* Header */}
          <div className="bg-purple-800 px-3 py-2 font-bold flex items-center gap-2">
            <span>🧪</span>
            <span>TESTER MODE</span>
            {user.is_punc_admin && (
              <span className="ml-auto text-xs bg-purple-600 px-2 py-0.5 rounded">ADMIN</span>
            )}
          </div>

          <div className="p-3 space-y-4 max-h-[70vh] overflow-y-auto">
            {/* Current Context */}
            <div className="text-xs text-purple-300">
              <p>Page: {pathname}</p>
              {currentChapter && <p>Chapter: {currentChapter.name}</p>}
              {userRole && <p>Your Role: {userRole}</p>}
              {currentMeeting && (
                <p>Meeting: {currentMeeting.status} ({currentMeeting.scheduled_date})</p>
              )}
            </div>

            {/* Last Result */}
            {lastResult && (
              <div className={`text-xs p-2 rounded ${
                lastResult.startsWith('✓') ? 'bg-green-800' : 'bg-red-800'
              }`}>
                {lastResult}
              </div>
            )}

            {/* Database Reset */}
            <div>
              <p className="text-xs text-purple-400 mb-2 font-medium">Reset Database State</p>
              <div className="grid grid-cols-2 gap-1">
                {[
                  ['three-chapters', '3 Chapters'],
                  ['rsvp-one-week-oak', 'RSVP -7 days'],
                  ['rsvp-one-day-oak', 'RSVP -1 day'],
                  ['pre-meeting-oak', 'Pre-Meeting'],
                  ['mostly-checked-in-oak', 'Mostly Checked In'],
                  ['mid-meeting-oak', 'Mid-Meeting'],
                  ['post-meeting-oak', 'Post-Meeting'],
                  ['onboarding-queue', 'Onboarding Queue'],
                  ['admin-overview', 'Admin Overview'],
                ].map(([state, label]) => (
                  <button
                    key={state}
                    onClick={() => runSeedState(state)}
                    disabled={isLoading}
                    className="px-2 py-1 bg-purple-700 hover:bg-purple-600 rounded text-xs disabled:opacity-50"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Role Switcher */}
            {currentChapter && (
              <div>
                <p className="text-xs text-purple-400 mb-2 font-medium">Change Your Role</p>
                <div className="flex gap-1">
                  {['leader', 'backup_leader', 'member'].map(role => (
                    <button
                      key={role}
                      onClick={() => changeRole(role)}
                      disabled={isLoading || userRole === role}
                      className={`px-2 py-1 rounded text-xs ${
                        userRole === role
                          ? 'bg-purple-500 cursor-default'
                          : 'bg-purple-700 hover:bg-purple-600'
                      } disabled:opacity-50`}
                    >
                      {role.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Meeting Date Shifter */}
            {currentMeeting && currentMeeting.status === 'scheduled' && (
              <div>
                <p className="text-xs text-purple-400 mb-2 font-medium">Move Meeting Date</p>
                <div className="flex gap-1 flex-wrap">
                  {[
                    ['now', 'Now'],
                    ['+15min', '+15 min'],
                    ['+1day', '+1 day'],
                    ['+3days', '+3 days'],
                    ['+7days', '+7 days'],
                  ].map(([offset, label]) => (
                    <button
                      key={offset}
                      onClick={() => shiftMeetingDate(offset)}
                      disabled={isLoading}
                      className="px-2 py-1 bg-purple-700 hover:bg-purple-600 rounded text-xs disabled:opacity-50"
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Meeting Simulation */}
            {currentMeeting && currentMeeting.status === 'in_progress' && (
              <>
                <div>
                  <p className="text-xs text-purple-400 mb-2 font-medium">Simulate Check-in Duration</p>
                  <div className="flex gap-1 flex-wrap">
                    {[
                      [45, '45 sec'],
                      [120, '2 min'],
                      [300, '5 min'],
                      [600, '10 min'],
                    ].map(([secs, label]) => (
                      <button
                        key={secs}
                        onClick={() => simulateCheckin(secs as number)}
                        disabled={isLoading}
                        className="px-2 py-1 bg-purple-700 hover:bg-purple-600 rounded text-xs disabled:opacity-50"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-purple-400 mb-2 font-medium">Skip to Section</p>
                  <div className="flex gap-1 flex-wrap">
                    {[
                      ['lightning_round', 'Lightning'],
                      ['full_checkins', 'Full Check-ins'],
                      ['curriculum', 'Curriculum'],
                      ['closing', 'Closing'],
                    ].map(([section, label]) => (
                      <button
                        key={section}
                        onClick={() => skipToSection(section)}
                        disabled={isLoading}
                        className="px-2 py-1 bg-purple-700 hover:bg-purple-600 rounded text-xs disabled:opacity-50"
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Meeting acceleration - show on any meeting page */}
            {pathname.includes('/meetings/') && (
              <div className="space-y-2">
                <p className="text-xs text-purple-400 mb-2 font-medium">Meeting Acceleration</p>
                <button
                  onClick={accelerateLightning}
                  disabled={isLoading}
                  className="w-full px-2 py-1 bg-yellow-700 hover:bg-yellow-600 rounded text-xs disabled:opacity-50"
                >
                  ⚡ Accelerate Lightning Round
                </button>
                <button
                  onClick={accelerateCheckins}
                  disabled={isLoading}
                  className="w-full px-2 py-1 bg-yellow-700 hover:bg-yellow-600 rounded text-xs disabled:opacity-50"
                >
                  ⚡ Accelerate Checkins
                </button>
                <button
                  onClick={completeCurriculum}
                  disabled={isLoading}
                  className="w-full px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-xs disabled:opacity-50"
                >
                  Complete All Curriculum Responses
                </button>
                <button
                  onClick={completeFeedback}
                  disabled={isLoading}
                  className="w-full px-2 py-1 bg-green-700 hover:bg-green-600 rounded text-xs disabled:opacity-50"
                >
                  Complete All Meeting Feedback
                </button>
              </div>
            )}

            {/* Manual Job Triggers */}
            <div>
              <p className="text-xs text-purple-400 mb-2 font-medium">Run Background Jobs</p>
              <button
                onClick={runEscalationCheck}
                disabled={isLoading}
                className="w-full px-2 py-1 bg-purple-700 hover:bg-purple-600 rounded text-xs disabled:opacity-50"
              >
                Run RSVP Escalation Check
              </button>
            </div>

            {/* Test User Logins */}
            <div>
              <p className="text-xs text-purple-400 mb-2 font-medium">Test User Logins</p>
              <p className="text-xs text-purple-300 mb-1">
                Open incognito window and log in as:
              </p>
              <div className="text-xs text-purple-200 space-y-1 bg-purple-800 p-2 rounded">
                <p><strong>Apollo</strong> (Oak Leader): apollo@test.punc</p>
                <p><strong>Atlas</strong> (Oak Member): atlas@test.punc</p>
                <p><strong>Orion</strong> (Pine Leader): orion@test.punc</p>
                <p className="text-purple-400 mt-1">Password for all: testpass123</p>
              </div>
            </div>

            {/* Loading indicator */}
            {isLoading && (
              <div className="text-center text-purple-300">
                Loading...
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
