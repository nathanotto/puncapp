# PUNCapp Session 8: Testing Infrastructure & Seed Data

## Context

Sessions 1-7 built the complete meeting cycle. Before adding more features (Admin, Onboarding, Formation), we need solid testing infrastructure. This session builds the Tester Mode, seed data states, and simulation controls that make testing a complex workflow app manageable.

**The testing challenge:** PUNCapp has temporal workflows that unfold over days (RSVP escalation) and minutes (timed check-ins). You can't realistically wait through all of this. You need to:
- Reset to known states quickly
- Shift meeting dates to trigger time-based logic
- Simulate elapsed time for check-ins
- See what different roles see
- Verify the system state is correct

**Session 8 scope:** Testing infrastructure + comprehensive seed data

## Primary References

1. **TOD-SPECIFICATION.md** — All flows for understanding what needs testing
2. **Previous session prompts** — What we've built

---

## Step 1: Add Tester and Admin Flags to Users

```sql
-- Add tester and admin flags
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_tester boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_punc_admin boolean DEFAULT false;

-- Set Nathan as tester and admin
UPDATE public.users
SET is_tester = true, is_punc_admin = true
WHERE id = '78d0b1d5-08a6-4923-8bef-49d804cafa73';
```

---

## Step 2: Create Tester State Table

Track tester-specific settings like simulated role.

```sql
CREATE TABLE tester_state (
  user_id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Role override for current chapter
  override_chapter_id uuid REFERENCES chapters(id),
  override_role text CHECK (override_role IN ('leader', 'backup_leader', 'member', 'scribe')),
  
  -- Any other tester state we need
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- No RLS needed - only testers access this
ALTER TABLE tester_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Testers can manage own state" ON tester_state
  FOR ALL USING (user_id = auth.uid());
```

---

## Step 3: Create the Tester Panel Component

**`/components/tester/TesterPanel.tsx`**

A floating panel visible on every page when user is a tester.

```typescript
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
```

---

## Step 4: Add Tester Panel to Layout

**Update `/app/layout.tsx`** to include Tester Panel on all pages:

```typescript
import { TesterPanel } from '@/components/tester/TesterPanel';

// In the layout component, after getting the user:
const { data: user } = await supabase
  .from('users')
  .select('id, is_tester, is_punc_admin')
  .eq('id', session.user.id)
  .single();

// In the JSX, add before closing </body>:
{user?.is_tester && (
  <TesterPanel 
    user={user}
    // These will be populated by page-specific context
    currentChapter={undefined}
    currentMeeting={undefined}
    userRole={undefined}
  />
)}
```

**Create a context provider** to pass current page context to the Tester Panel:

**`/components/tester/TesterContext.tsx`**

```typescript
'use client';

import { createContext, useContext, useState, ReactNode } from 'react';

interface TesterContextType {
  currentChapter: { id: string; name: string } | null;
  currentMeeting: { id: string; status: string; scheduled_date: string; scheduled_time: string } | null;
  userRole: string | null;
  setCurrentChapter: (chapter: { id: string; name: string } | null) => void;
  setCurrentMeeting: (meeting: { id: string; status: string; scheduled_date: string; scheduled_time: string } | null) => void;
  setUserRole: (role: string | null) => void;
}

const TesterContext = createContext<TesterContextType | null>(null);

export function TesterProvider({ children }: { children: ReactNode }) {
  const [currentChapter, setCurrentChapter] = useState<{ id: string; name: string } | null>(null);
  const [currentMeeting, setCurrentMeeting] = useState<{ id: string; status: string; scheduled_date: string; scheduled_time: string } | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  
  return (
    <TesterContext.Provider value={{
      currentChapter,
      currentMeeting,
      userRole,
      setCurrentChapter,
      setCurrentMeeting,
      setUserRole,
    }}>
      {children}
    </TesterContext.Provider>
  );
}

export function useTesterContext() {
  const context = useContext(TesterContext);
  if (!context) {
    throw new Error('useTesterContext must be used within TesterProvider');
  }
  return context;
}
```

---

## Step 5: Create Tester API Routes

### Seed Database State

**`/app/api/tester/seed/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { runSeedState } from '@/lib/tester/seed-states';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  // Verify user is tester
  const { data: userData } = await supabase
    .from('users')
    .select('is_tester')
    .eq('id', user.id)
    .single();
  
  if (!userData?.is_tester) {
    return NextResponse.json({ error: 'Not a tester' }, { status: 403 });
  }
  
  const { state } = await request.json();
  
  try {
    await runSeedState(supabase, state);
    return NextResponse.json({ success: true, state });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
```

### Shift Meeting Date

**`/app/api/tester/shift-meeting/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { data: userData } = await supabase
    .from('users')
    .select('is_tester')
    .eq('id', user.id)
    .single();
  
  if (!userData?.is_tester) {
    return NextResponse.json({ error: 'Not a tester' }, { status: 403 });
  }
  
  const { meetingId, offset } = await request.json();
  
  // Calculate new date based on offset
  const now = new Date();
  let newDate: Date;
  
  switch (offset) {
    case 'now':
      newDate = now;
      break;
    case '+15min':
      newDate = new Date(now.getTime() + 15 * 60 * 1000);
      break;
    case '+1day':
      newDate = new Date(now.getTime() + 24 * 60 * 60 * 1000);
      break;
    case '+3days':
      newDate = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
      break;
    case '+7days':
      newDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      break;
    default:
      return NextResponse.json({ error: 'Invalid offset' }, { status: 400 });
  }
  
  const dateStr = newDate.toISOString().split('T')[0];
  const timeStr = newDate.toTimeString().slice(0, 5);
  
  // Also update RSVP deadline to 2 days before
  const rsvpDeadline = new Date(newDate.getTime() - 2 * 24 * 60 * 60 * 1000);
  
  await supabase
    .from('meetings')
    .update({
      scheduled_date: dateStr,
      scheduled_time: timeStr,
      rsvp_deadline: rsvpDeadline.toISOString().split('T')[0],
    })
    .eq('id', meetingId);
  
  return NextResponse.json({ 
    success: true, 
    newDate: `${dateStr} ${timeStr}` 
  });
}
```

### Run Escalation Check

**`/app/api/tester/run-escalation/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { runEscalationCheck } from '@/lib/escalation';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { data: userData } = await supabase
    .from('users')
    .select('is_tester')
    .eq('id', user.id)
    .single();
  
  if (!userData?.is_tester) {
    return NextResponse.json({ error: 'Not a tester' }, { status: 403 });
  }
  
  try {
    const result = await runEscalationCheck(supabase);
    return NextResponse.json({ 
      success: true, 
      reminders: result.remindersSent,
      leaderTasks: result.leaderTasksCreated
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
```

### Change Role

**`/app/api/tester/change-role/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { data: userData } = await supabase
    .from('users')
    .select('is_tester')
    .eq('id', user.id)
    .single();
  
  if (!userData?.is_tester) {
    return NextResponse.json({ error: 'Not a tester' }, { status: 403 });
  }
  
  const { chapterId, newRole } = await request.json();
  
  // Actually change the role in chapter_memberships
  await supabase
    .from('chapter_memberships')
    .update({ role: newRole })
    .eq('user_id', user.id)
    .eq('chapter_id', chapterId);
  
  return NextResponse.json({ success: true, newRole });
}
```

### Simulate Check-in

**`/app/api/tester/simulate-checkin/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { data: userData } = await supabase
    .from('users')
    .select('is_tester')
    .eq('id', user.id)
    .single();
  
  if (!userData?.is_tester) {
    return NextResponse.json({ error: 'Not a tester' }, { status: 403 });
  }
  
  const { meetingId, durationSeconds } = await request.json();
  
  // Get current meeting section and current person in queue
  const { data: meeting } = await supabase
    .from('meetings')
    .select('current_section')
    .eq('id', meetingId)
    .single();
  
  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }
  
  // Find the next person who hasn't gone yet
  const { data: timeLogs } = await supabase
    .from('meeting_time_log')
    .select('user_id')
    .eq('meeting_id', meetingId)
    .eq('section', meeting.current_section);
  
  const completedUserIds = new Set(timeLogs?.map(l => l.user_id) || []);
  
  const { data: attendees } = await supabase
    .from('attendance')
    .select('user_id')
    .eq('meeting_id', meetingId)
    .not('checked_in_at', 'is', null);
  
  const nextPerson = attendees?.find(a => !completedUserIds.has(a.user_id));
  
  if (!nextPerson) {
    return NextResponse.json({ error: 'No one left in queue' }, { status: 400 });
  }
  
  // Calculate overtime if applicable
  const allottedSeconds = meeting.current_section === 'lightning_round' ? 60 : 600; // 1 min or 10 min
  const overtimeSeconds = Math.max(0, durationSeconds - allottedSeconds);
  
  const now = new Date();
  const startTime = new Date(now.getTime() - durationSeconds * 1000);
  
  // Insert time log
  await supabase.from('meeting_time_log').insert({
    meeting_id: meetingId,
    section: meeting.current_section,
    user_id: nextPerson.user_id,
    start_time: startTime.toISOString(),
    end_time: now.toISOString(),
    duration_seconds: durationSeconds,
    overtime_seconds: overtimeSeconds,
    priority: meeting.current_section === 'lightning_round' ? (Math.random() > 0.5 ? 1 : 2) : null,
    skipped: false,
  });
  
  return NextResponse.json({ success: true, userId: nextPerson.user_id, durationSeconds });
}
```

### Skip to Section

**`/app/api/tester/skip-to-section/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';
import { generateRealisticMeetingData } from '@/lib/tester/generate-data';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { data: userData } = await supabase
    .from('users')
    .select('is_tester')
    .eq('id', user.id)
    .single();
  
  if (!userData?.is_tester) {
    return NextResponse.json({ error: 'Not a tester' }, { status: 403 });
  }
  
  const { meetingId, section, generateData } = await request.json();
  
  if (generateData) {
    await generateRealisticMeetingData(supabase, meetingId, section);
  }
  
  // Update meeting section
  await supabase
    .from('meetings')
    .update({ current_section: section })
    .eq('id', meetingId);
  
  return NextResponse.json({ success: true, section });
}
```

---

## Step 6: Create Seed State Library

**`/lib/tester/seed-states.ts`**

```typescript
import { SupabaseClient } from '@supabase/supabase-js';

// Nathan's user ID - always preserved
const NATHAN_ID = '78d0b1d5-08a6-4923-8bef-49d804cafa73';

// Test user data with Greek mythology names
const TEST_USERS = [
  // Oak Chapter (8 members) - Nathan is leader
  { id: 'usr-apollo', name: 'Apollo Sunbrook', email: 'apollo@test.punc', chapter: 'oak', role: 'backup_leader' },
  { id: 'usr-atlas', name: 'Atlas Stronghold', email: 'atlas@test.punc', chapter: 'oak', role: 'member' },
  { id: 'usr-ares', name: 'Ares Ironfist', email: 'ares@test.punc', chapter: 'oak', role: 'member' },
  { id: 'usr-hermes', name: 'Hermes Swift', email: 'hermes@test.punc', chapter: 'oak', role: 'member' },
  { id: 'usr-hades', name: 'Hades Deepwell', email: 'hades@test.punc', chapter: 'oak', role: 'member' },
  { id: 'usr-zeus', name: 'Zeus Thunderstone', email: 'zeus@test.punc', chapter: 'oak', role: 'member' },
  { id: 'usr-poseidon', name: 'Poseidon Wavecrest', email: 'poseidon@test.punc', chapter: 'oak', role: 'member' },
  
  // Pine Chapter (12 members) - at capacity
  { id: 'usr-orion', name: 'Orion Starfield', email: 'orion@test.punc', chapter: 'pine', role: 'leader' },
  { id: 'usr-phoenix', name: 'Phoenix Ashborn', email: 'phoenix@test.punc', chapter: 'pine', role: 'backup_leader' },
  { id: 'usr-titan', name: 'Titan Mountainheart', email: 'titan@test.punc', chapter: 'pine', role: 'member' },
  { id: 'usr-chronos', name: 'Chronos Timekeep', email: 'chronos@test.punc', chapter: 'pine', role: 'member' },
  { id: 'usr-helios', name: 'Helios Dawnbringer', email: 'helios@test.punc', chapter: 'pine', role: 'member' },
  { id: 'usr-pan', name: 'Pan Wildwood', email: 'pan@test.punc', chapter: 'pine', role: 'member' },
  { id: 'usr-morpheus', name: 'Morpheus Dreamweaver', email: 'morpheus@test.punc', chapter: 'pine', role: 'member' },
  { id: 'usr-eros', name: 'Eros Heartstring', email: 'eros@test.punc', chapter: 'pine', role: 'member' },
  { id: 'usr-dionysus', name: 'Dionysus Vineheart', email: 'dionysus@test.punc', chapter: 'pine', role: 'member' },
  { id: 'usr-hephaestus', name: 'Hephaestus Forgefire', email: 'hephaestus@test.punc', chapter: 'pine', role: 'member' },
  { id: 'usr-apollo2', name: 'Apollo Brightbow', email: 'apollo2@test.punc', chapter: 'pine', role: 'member' },
  
  // Elm Chapter (5 members) - newly formed
  { id: 'usr-prometheus', name: 'Prometheus Lightbringer', email: 'prometheus@test.punc', chapter: 'elm', role: 'leader' },
  { id: 'usr-icarus', name: 'Icarus Skydancer', email: 'icarus@test.punc', chapter: 'elm', role: 'backup_leader' },
  { id: 'usr-theseus', name: 'Theseus Labyrinth', email: 'theseus@test.punc', chapter: 'elm', role: 'member' },
  { id: 'usr-perseus', name: 'Perseus Shieldbearer', email: 'perseus@test.punc', chapter: 'elm', role: 'member' },
  { id: 'usr-achilles', name: 'Achilles Swiftfoot', email: 'achilles@test.punc', chapter: 'elm', role: 'member' },
  
  // Unassigned (for onboarding queue) - 10 users
  { id: 'usr-hercules', name: 'Hercules Strongarm', email: 'hercules@test.punc', chapter: null, role: null },
  { id: 'usr-odysseus', name: 'Odysseus Wanderer', email: 'odysseus@test.punc', chapter: null, role: null },
  { id: 'usr-ajax', name: 'Ajax Greatshield', email: 'ajax@test.punc', chapter: null, role: null },
  { id: 'usr-jason', name: 'Jason Goldenfleece', email: 'jason@test.punc', chapter: null, role: null },
  { id: 'usr-minos', name: 'Minos Crownbearer', email: 'minos@test.punc', chapter: null, role: null },
  { id: 'usr-orpheus', name: 'Orpheus Songweaver', email: 'orpheus@test.punc', chapter: null, role: null },
  { id: 'usr-daedalus', name: 'Daedalus Craftmaster', email: 'daedalus@test.punc', chapter: null, role: null },
  { id: 'usr-narcissus', name: 'Narcissus Clearwater', email: 'narcissus@test.punc', chapter: null, role: null },
  { id: 'usr-adonis', name: 'Adonis Fairfield', email: 'adonis@test.punc', chapter: null, role: null },
  { id: 'usr-castor', name: 'Castor Twinstar', email: 'castor@test.punc', chapter: null, role: null },
];

// Denver area addresses
const DENVER_ADDRESSES = [
  '1600 Broadway, Denver, CO 80202',
  '2000 E 16th Ave, Denver, CO 80206',
  '3300 E 1st Ave, Denver, CO 80206',
  '1701 Champa St, Denver, CO 80202',
  '500 16th St, Denver, CO 80202',
  '1550 Court Pl, Denver, CO 80202',
  '1801 California St, Denver, CO 80202',
  '1660 Lincoln St, Denver, CO 80264',
  '1901 Wazee St, Denver, CO 80202',
  '2500 Lawrence St, Denver, CO 80205',
];

const CHAPTERS = [
  { 
    id: 'ch-oak', 
    name: 'The Oak Chapter', 
    location: '1600 Broadway, Denver, CO 80202',
    meeting_day: 'tuesday',
    meeting_time: '19:00',
  },
  { 
    id: 'ch-pine', 
    name: 'The Pine Chapter', 
    location: '2000 E 16th Ave, Denver, CO 80206',
    meeting_day: 'wednesday',
    meeting_time: '19:30',
  },
  { 
    id: 'ch-elm', 
    name: 'The Elm Chapter', 
    location: '3300 E 1st Ave, Denver, CO 80206',
    meeting_day: 'thursday',
    meeting_time: '18:30',
  },
];

export async function runSeedState(supabase: SupabaseClient, state: string) {
  // Clear existing data (except Nathan's auth)
  await clearDatabase(supabase);
  
  // Base setup for all states
  await seedBaseData(supabase);
  
  // State-specific setup
  switch (state) {
    case 'three-chapters':
      await seedThreeChapters(supabase);
      break;
    case 'rsvp-one-week-oak':
      await seedThreeChapters(supabase);
      await seedRsvpOneWeekOak(supabase);
      break;
    case 'rsvp-one-day-oak':
      await seedThreeChapters(supabase);
      await seedRsvpOneDayOak(supabase);
      break;
    case 'pre-meeting-oak':
      await seedThreeChapters(supabase);
      await seedPreMeetingOak(supabase);
      break;
    case 'mostly-checked-in-oak':
      await seedThreeChapters(supabase);
      await seedMostlyCheckedInOak(supabase);
      break;
    case 'mid-meeting-oak':
      await seedThreeChapters(supabase);
      await seedMidMeetingOak(supabase);
      break;
    case 'post-meeting-oak':
      await seedThreeChapters(supabase);
      await seedPostMeetingOak(supabase);
      break;
    case 'onboarding-queue':
      await seedThreeChapters(supabase);
      await seedOnboardingQueue(supabase);
      break;
    case 'admin-overview':
      await seedAdminOverview(supabase);
      break;
    default:
      throw new Error(`Unknown seed state: ${state}`);
  }
}

async function clearDatabase(supabase: SupabaseClient) {
  // Delete in order respecting foreign keys
  await supabase.from('meeting_feedback').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('meeting_recordings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('curriculum_responses').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('chapter_curriculum_history').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('meeting_time_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('commitments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('pending_tasks').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('notification_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('leadership_log').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('meetings').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('chapter_memberships').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('chapters').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('tester_state').delete().neq('user_id', '00000000-0000-0000-0000-000000000000');
  
  // Delete test users (but not Nathan)
  await supabase.from('users').delete().neq('id', NATHAN_ID);
}

async function seedBaseData(supabase: SupabaseClient) {
  // Ensure Nathan has tester and admin flags
  await supabase
    .from('users')
    .update({ 
      is_tester: true, 
      is_punc_admin: true,
      name: 'Nathan Otto',
      username: 'notto'
    })
    .eq('id', NATHAN_ID);
  
  // Seed curriculum (needed for all states)
  await seedCurriculum(supabase);
}

async function seedCurriculum(supabase: SupabaseClient) {
  // Create sequence
  await supabase.from('curriculum_sequences').insert({
    id: 'seq-foundations',
    title: 'Foundations of Brotherhood',
    description: 'Core principles for PUNC members',
    order_index: 1,
  });
  
  // Create modules
  const modules = [
    {
      id: 'mod-presence',
      title: 'The Power of Presence',
      principle: 'Be in brotherhood',
      description: 'Brotherhood begins with showing up—physically, emotionally, mentally.',
      reflective_question: 'When was the last time you felt truly seen by another man?',
      exercise: 'Pair up. For 2 minutes each, simply look at each other without speaking.',
      sequence_id: 'seq-foundations',
      order_in_sequence: 1,
    },
    {
      id: 'mod-hurt',
      title: 'Fighting Hurt',
      principle: 'Fight hurt',
      description: 'We fight hurt—in ourselves and in others.',
      reflective_question: 'What hurt are you currently carrying that you have not shared?',
      exercise: 'Write down one hurt. Share it with the group in one sentence.',
      sequence_id: 'seq-foundations',
      order_in_sequence: 2,
    },
    {
      id: 'mod-dangerous',
      title: 'Dangerous Safety',
      principle: 'Be dangerous, but not a danger',
      description: 'A man in his power is dangerous. The key is channeling that power with wisdom.',
      reflective_question: 'In what area have you been playing it too safe?',
      exercise: 'Stand up. Take up space. Let a sound come from your chest.',
      sequence_id: 'seq-foundations',
      order_in_sequence: 3,
    },
  ];
  
  await supabase.from('curriculum_modules').insert(modules);
}

async function seedTestUsers(supabase: SupabaseClient) {
  // Create test users in auth (this would normally be done via auth signup)
  // For testing, we create them directly in public.users with a known structure
  
  for (const user of TEST_USERS) {
    await supabase.from('users').insert({
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.name.split(' ')[0].toLowerCase(),
      is_tester: false,
      is_punc_admin: false,
    });
  }
}

async function seedThreeChapters(supabase: SupabaseClient) {
  await seedTestUsers(supabase);
  
  // Create chapters
  for (const chapter of CHAPTERS) {
    await supabase.from('chapters').insert({
      id: chapter.id,
      name: chapter.name,
      status: 'open',
      default_location: chapter.location,
      recurring_meeting_day: chapter.meeting_day,
      recurring_meeting_time: chapter.meeting_time,
      meeting_frequency: 'biweekly',
    });
  }
  
  // Nathan is leader of Oak, backup_leader of Pine
  await supabase.from('chapter_memberships').insert([
    { chapter_id: 'ch-oak', user_id: NATHAN_ID, role: 'leader', is_active: true },
    { chapter_id: 'ch-pine', user_id: NATHAN_ID, role: 'backup_leader', is_active: true },
  ]);
  
  // Add test users to their chapters
  for (const user of TEST_USERS) {
    if (user.chapter) {
      const chapterId = user.chapter === 'oak' ? 'ch-oak' : user.chapter === 'pine' ? 'ch-pine' : 'ch-elm';
      await supabase.from('chapter_memberships').insert({
        chapter_id: chapterId,
        user_id: user.id,
        role: user.role,
        is_active: true,
      });
    }
  }
}

async function seedRsvpOneWeekOak(supabase: SupabaseClient) {
  // Create meeting 7 days from now
  const meetingDate = new Date();
  meetingDate.setDate(meetingDate.getDate() + 7);
  
  const meetingId = 'mtg-oak-upcoming';
  
  await supabase.from('meetings').insert({
    id: meetingId,
    chapter_id: 'ch-oak',
    scheduled_date: meetingDate.toISOString().split('T')[0],
    scheduled_time: '19:00',
    location: '1600 Broadway, Denver, CO 80202',
    status: 'scheduled',
    rsvp_deadline: new Date(meetingDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });
  
  // Create RSVP tasks for all Oak members (no responses yet)
  const oakMembers = TEST_USERS.filter(u => u.chapter === 'oak').map(u => u.id);
  oakMembers.push(NATHAN_ID);
  
  for (const userId of oakMembers) {
    await supabase.from('pending_tasks').insert({
      task_type: 'respond_to_rsvp',
      assigned_to: userId,
      related_entity_type: 'meeting',
      related_entity_id: meetingId,
      due_date: new Date(meetingDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    });
    
    await supabase.from('attendance').insert({
      meeting_id: meetingId,
      user_id: userId,
      rsvp_status: 'no_response',
    });
  }
}

async function seedRsvpOneDayOak(supabase: SupabaseClient) {
  // Create meeting 1 day from now
  const meetingDate = new Date();
  meetingDate.setDate(meetingDate.getDate() + 1);
  
  const meetingId = 'mtg-oak-upcoming';
  
  await supabase.from('meetings').insert({
    id: meetingId,
    chapter_id: 'ch-oak',
    scheduled_date: meetingDate.toISOString().split('T')[0],
    scheduled_time: '19:00',
    location: '1600 Broadway, Denver, CO 80202',
    status: 'scheduled',
    rsvp_deadline: new Date().toISOString().split('T')[0], // Deadline is now
  });
  
  const oakMembers = TEST_USERS.filter(u => u.chapter === 'oak').map(u => u.id);
  
  // Most have responded, 2 have not
  const unresponsive = [oakMembers[0], oakMembers[1]]; // Apollo and Atlas
  
  // Nathan responded yes
  await supabase.from('attendance').insert({
    meeting_id: meetingId,
    user_id: NATHAN_ID,
    rsvp_status: 'yes',
  });
  
  for (let i = 0; i < oakMembers.length; i++) {
    const userId = oakMembers[i];
    const isUnresponsive = unresponsive.includes(userId);
    
    await supabase.from('attendance').insert({
      meeting_id: meetingId,
      user_id: userId,
      rsvp_status: isUnresponsive ? 'no_response' : (i % 3 === 0 ? 'no' : 'yes'),
      rsvp_reason: i % 3 === 0 && !isUnresponsive ? 'Family commitment' : null,
      reminder_sent_at: isUnresponsive ? new Date().toISOString() : null,
    });
    
    // Create leader outreach task for unresponsive
    if (isUnresponsive) {
      await supabase.from('pending_tasks').insert({
        task_type: 'contact_unresponsive_member',
        assigned_to: NATHAN_ID,
        related_entity_type: 'attendance',
        related_entity_id: meetingId,
        metadata: { member_id: userId },
      });
    }
  }
}

async function seedPreMeetingOak(supabase: SupabaseClient) {
  // Create meeting for right now
  const now = new Date();
  
  const meetingId = 'mtg-oak-now';
  
  await supabase.from('meetings').insert({
    id: meetingId,
    chapter_id: 'ch-oak',
    scheduled_date: now.toISOString().split('T')[0],
    scheduled_time: now.toTimeString().slice(0, 5),
    location: '1600 Broadway, Denver, CO 80202',
    status: 'scheduled',
    rsvp_deadline: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    selected_curriculum_id: 'mod-presence',
  });
  
  const oakMembers = TEST_USERS.filter(u => u.chapter === 'oak').map(u => u.id);
  oakMembers.push(NATHAN_ID);
  
  // All have RSVP'd yes
  for (const userId of oakMembers) {
    await supabase.from('attendance').insert({
      meeting_id: meetingId,
      user_id: userId,
      rsvp_status: 'yes',
    });
  }
}

async function seedMostlyCheckedInOak(supabase: SupabaseClient) {
  await seedPreMeetingOak(supabase);
  
  const meetingId = 'mtg-oak-now';
  const now = new Date();
  
  // Start the meeting
  await supabase
    .from('meetings')
    .update({
      status: 'in_progress',
      actual_start_time: now.toISOString(),
      current_section: 'opening_meditation',
      scribe_id: 'usr-apollo', // Apollo is scribe
    })
    .eq('id', meetingId);
  
  const oakMembers = TEST_USERS.filter(u => u.chapter === 'oak').map(u => u.id);
  
  // Nathan and all but one member checked in
  await supabase
    .from('attendance')
    .update({ 
      checked_in_at: now.toISOString(),
      attendance_type: 'in_person'
    })
    .eq('meeting_id', meetingId)
    .eq('user_id', NATHAN_ID);
  
  for (let i = 0; i < oakMembers.length - 1; i++) {
    await supabase
      .from('attendance')
      .update({ 
        checked_in_at: now.toISOString(),
        attendance_type: i % 4 === 0 ? 'video' : 'in_person'
      })
      .eq('meeting_id', meetingId)
      .eq('user_id', oakMembers[i]);
  }
  // Last member (Poseidon) has not checked in
}

async function seedMidMeetingOak(supabase: SupabaseClient) {
  await seedMostlyCheckedInOak(supabase);
  
  const meetingId = 'mtg-oak-now';
  const now = new Date();
  
  // Check in the last person
  await supabase
    .from('attendance')
    .update({ 
      checked_in_at: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
      attendance_type: 'in_person',
      checked_in_late: true
    })
    .eq('meeting_id', meetingId)
    .eq('user_id', 'usr-poseidon');
  
  // Complete opening
  await supabase.from('meeting_time_log').insert([
    { meeting_id: meetingId, section: 'opening_meditation', start_time: now.toISOString(), end_time: new Date(now.getTime() + 5 * 60 * 1000).toISOString() },
    { meeting_id: meetingId, section: 'opening_ethos', start_time: new Date(now.getTime() + 5 * 60 * 1000).toISOString(), end_time: new Date(now.getTime() + 8 * 60 * 1000).toISOString() },
  ]);
  
  // Complete lightning round with realistic data
  const oakMembers = TEST_USERS.filter(u => u.chapter === 'oak').map(u => u.id);
  oakMembers.unshift(NATHAN_ID);
  
  let timeOffset = 8 * 60 * 1000;
  for (let i = 0; i < oakMembers.length; i++) {
    const duration = 45 + Math.floor(Math.random() * 30); // 45-75 seconds
    const startTime = new Date(now.getTime() + timeOffset);
    const endTime = new Date(startTime.getTime() + duration * 1000);
    
    await supabase.from('meeting_time_log').insert({
      meeting_id: meetingId,
      section: 'lightning_round',
      user_id: oakMembers[i],
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_seconds: duration,
      overtime_seconds: Math.max(0, duration - 60),
      priority: i < 3 ? 1 : 2, // First 3 are P1
      skipped: false,
    });
    
    timeOffset += duration * 1000 + 5000; // 5 sec between
  }
  
  // Update meeting section
  await supabase
    .from('meetings')
    .update({ current_section: 'full_checkins' })
    .eq('id', meetingId);
}

async function seedPostMeetingOak(supabase: SupabaseClient) {
  await seedMidMeetingOak(supabase);
  
  const meetingId = 'mtg-oak-now';
  const now = new Date();
  
  // Complete full check-ins
  const oakMembers = TEST_USERS.filter(u => u.chapter === 'oak').map(u => u.id);
  oakMembers.unshift(NATHAN_ID);
  
  let timeOffset = 30 * 60 * 1000; // Start after lightning
  for (let i = 0; i < oakMembers.length; i++) {
    const duration = 300 + Math.floor(Math.random() * 300); // 5-10 minutes
    const startTime = new Date(now.getTime() + timeOffset);
    const endTime = new Date(startTime.getTime() + duration * 1000);
    
    await supabase.from('meeting_time_log').insert({
      meeting_id: meetingId,
      section: 'full_checkins',
      user_id: oakMembers[i],
      start_time: startTime.toISOString(),
      end_time: endTime.toISOString(),
      duration_seconds: duration,
      overtime_seconds: Math.max(0, duration - 420),
      stretch_goal_action: i % 3 === 0 ? 'new' : i % 3 === 1 ? 'kept' : 'completed',
      requested_support: i === 2, // Ares requested support
      skipped: false,
    });
    
    timeOffset += duration * 1000 + 5000;
  }
  
  // Create some commitments
  await supabase.from('commitments').insert([
    {
      id: 'cmt-nathan-stretch',
      committer_id: NATHAN_ID,
      commitment_type: 'stretch_goal',
      description: 'Have one difficult conversation this week',
      status: 'active',
      created_at_meeting_id: meetingId,
    },
    {
      id: 'cmt-apollo-support',
      committer_id: 'usr-apollo',
      receiver_id: 'usr-ares',
      commitment_type: 'support_a_man',
      description: 'Call Ares Wednesday to check in about job search',
      status: 'active',
      created_at_meeting_id: meetingId,
      due_date: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    },
  ]);
  
  // Curriculum responses
  for (const userId of oakMembers) {
    await supabase.from('curriculum_responses').insert({
      chapter_curriculum_history_id: null, // Would need to create this
      user_id: userId,
      meeting_id: meetingId,
      module_id: 'mod-presence',
      response: `Test response from ${userId} about presence and being seen.`,
    });
  }
  
  // Meeting feedback
  for (let i = 0; i < oakMembers.length; i++) {
    const userId = oakMembers[i];
    const otherMembers = oakMembers.filter(m => m !== userId);
    
    await supabase.from('meeting_feedback').insert({
      meeting_id: meetingId,
      user_id: userId,
      value_rating: 7 + Math.floor(Math.random() * 3), // 7-9
      most_value_user_id: otherMembers[Math.floor(Math.random() * otherMembers.length)],
    });
  }
  
  // Complete meeting
  await supabase
    .from('meetings')
    .update({ 
      status: 'completed',
      current_section: 'ended',
      completed_at: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
    })
    .eq('id', meetingId);
}

async function seedOnboardingQueue(supabase: SupabaseClient) {
  // Unassigned users are already created in seedTestUsers
  // Just make sure they have Denver addresses
  const unassigned = TEST_USERS.filter(u => u.chapter === null);
  
  for (let i = 0; i < unassigned.length; i++) {
    await supabase
      .from('users')
      .update({ 
        address: DENVER_ADDRESSES[i % DENVER_ADDRESSES.length]
      })
      .eq('id', unassigned[i].id);
  }
}

async function seedAdminOverview(supabase: SupabaseClient) {
  await seedThreeChapters(supabase);
  
  // Create 3 completed meetings and 2 scheduled for each chapter
  const chapters = ['ch-oak', 'ch-pine', 'ch-elm'];
  const now = new Date();
  
  for (const chapterId of chapters) {
    const chapterMembers = TEST_USERS.filter(u => {
      const ch = u.chapter === 'oak' ? 'ch-oak' : u.chapter === 'pine' ? 'ch-pine' : u.chapter === 'elm' ? 'ch-elm' : null;
      return ch === chapterId;
    }).map(u => u.id);
    
    if (chapterId === 'ch-oak') chapterMembers.push(NATHAN_ID);
    
    // 3 past meetings
    for (let i = 1; i <= 3; i++) {
      const meetingDate = new Date(now.getTime() - i * 14 * 24 * 60 * 60 * 1000); // 2 weeks apart
      const meetingId = `mtg-${chapterId.split('-')[1]}-past-${i}`;
      
      await supabase.from('meetings').insert({
        id: meetingId,
        chapter_id: chapterId,
        scheduled_date: meetingDate.toISOString().split('T')[0],
        scheduled_time: '19:00',
        location: CHAPTERS.find(c => c.id === chapterId)?.location,
        status: 'completed',
        actual_start_time: meetingDate.toISOString(),
        completed_at: new Date(meetingDate.getTime() + 2 * 60 * 60 * 1000).toISOString(),
        current_section: 'ended',
        started_late: i === 2, // One meeting started late
      });
      
      // Attendance
      for (let j = 0; j < chapterMembers.length; j++) {
        const attended = j < chapterMembers.length - (i === 3 ? 2 : 0); // Some absences in oldest meeting
        
        await supabase.from('attendance').insert({
          meeting_id: meetingId,
          user_id: chapterMembers[j],
          rsvp_status: attended ? 'yes' : 'no',
          attendance_type: attended ? 'in_person' : null,
          checked_in_at: attended ? meetingDate.toISOString() : null,
        });
      }
      
      // Leadership log entries for issues
      if (i === 2) {
        await supabase.from('leadership_log').insert({
          chapter_id: chapterId,
          meeting_id: meetingId,
          log_type: 'meeting_started_late',
          description: 'Meeting started 12 minutes late',
          metadata: { minutes_late: 12 },
        });
      }
    }
    
    // 2 future meetings
    for (let i = 1; i <= 2; i++) {
      const meetingDate = new Date(now.getTime() + i * 14 * 24 * 60 * 60 * 1000);
      const meetingId = `mtg-${chapterId.split('-')[1]}-future-${i}`;
      
      await supabase.from('meetings').insert({
        id: meetingId,
        chapter_id: chapterId,
        scheduled_date: meetingDate.toISOString().split('T')[0],
        scheduled_time: '19:00',
        location: CHAPTERS.find(c => c.id === chapterId)?.location,
        status: 'scheduled',
        rsvp_deadline: new Date(meetingDate.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
    }
  }
}
```

---

## Step 7: Create Data Generator for Skipping Sections

**`/lib/tester/generate-data.ts`**

```typescript
import { SupabaseClient } from '@supabase/supabase-js';

export async function generateRealisticMeetingData(
  supabase: SupabaseClient,
  meetingId: string,
  targetSection: string
) {
  // Get meeting and attendees
  const { data: meeting } = await supabase
    .from('meetings')
    .select('*, chapter_id')
    .eq('id', meetingId)
    .single();
  
  const { data: attendees } = await supabase
    .from('attendance')
    .select('user_id')
    .eq('meeting_id', meetingId)
    .not('checked_in_at', 'is', null);
  
  if (!meeting || !attendees) return;
  
  const userIds = attendees.map(a => a.user_id);
  const now = new Date();
  
  const sections = ['opening_meditation', 'opening_ethos', 'lightning_round', 'full_checkins', 'curriculum', 'closing'];
  const targetIndex = sections.indexOf(targetSection);
  
  // Generate data for all sections before target
  if (targetIndex >= 0) {
    // Opening meditation
    await supabase.from('meeting_time_log').upsert({
      meeting_id: meetingId,
      section: 'opening_meditation',
      start_time: now.toISOString(),
      end_time: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
    }, { onConflict: 'meeting_id,section,user_id' });
  }
  
  if (targetIndex >= 1) {
    // Opening ethos
    await supabase.from('meeting_time_log').upsert({
      meeting_id: meetingId,
      section: 'opening_ethos',
      start_time: new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
      end_time: new Date(now.getTime() + 8 * 60 * 1000).toISOString(),
    }, { onConflict: 'meeting_id,section,user_id' });
  }
  
  if (targetIndex >= 2) {
    // Lightning round - generate for each user
    let timeOffset = 8 * 60 * 1000;
    for (let i = 0; i < userIds.length; i++) {
      const duration = 45 + Math.floor(Math.random() * 30);
      const startTime = new Date(now.getTime() + timeOffset);
      
      await supabase.from('meeting_time_log').upsert({
        meeting_id: meetingId,
        section: 'lightning_round',
        user_id: userIds[i],
        start_time: startTime.toISOString(),
        end_time: new Date(startTime.getTime() + duration * 1000).toISOString(),
        duration_seconds: duration,
        overtime_seconds: Math.max(0, duration - 60),
        priority: i < Math.ceil(userIds.length / 3) ? 1 : 2,
        skipped: false,
      }, { onConflict: 'meeting_id,section,user_id' });
      
      timeOffset += duration * 1000 + 3000;
    }
  }
  
  if (targetIndex >= 3) {
    // Full check-ins
    let timeOffset = 30 * 60 * 1000;
    for (let i = 0; i < userIds.length; i++) {
      const duration = 300 + Math.floor(Math.random() * 300);
      const startTime = new Date(now.getTime() + timeOffset);
      
      await supabase.from('meeting_time_log').upsert({
        meeting_id: meetingId,
        section: 'full_checkins',
        user_id: userIds[i],
        start_time: startTime.toISOString(),
        end_time: new Date(startTime.getTime() + duration * 1000).toISOString(),
        duration_seconds: duration,
        overtime_seconds: Math.max(0, duration - 420),
        stretch_goal_action: ['kept', 'completed', 'new', 'none'][i % 4],
        requested_support: i === 2,
        skipped: false,
      }, { onConflict: 'meeting_id,section,user_id' });
      
      timeOffset += duration * 1000 + 5000;
    }
  }
  
  if (targetIndex >= 4 && meeting.selected_curriculum_id) {
    // Curriculum responses
    for (const userId of userIds) {
      await supabase.from('curriculum_responses').upsert({
        user_id: userId,
        meeting_id: meetingId,
        module_id: meeting.selected_curriculum_id,
        response: `Generated test response for curriculum reflection.`,
      }, { onConflict: 'meeting_id,module_id,user_id' });
    }
  }
}
```

---

## Step 8: Test the Tester Infrastructure

### Test A: Tester Panel Visibility

1. Log in as Nathan (notto@nathanotto.com)
2. Verify purple Tester Panel appears in bottom-right
3. Verify ADMIN badge shows
4. Click toggle to collapse/expand

### Test B: Database Reset

1. Click "3 Chapters" in Tester Panel
2. Confirm the reset
3. Verify page reloads with fresh data
4. Check database has 3 chapters, ~30 users

### Test C: State Transitions

1. Reset to "Pre-Meeting"
2. Verify Oak Chapter has a meeting scheduled for "now"
3. Reset to "Mid-Meeting"
4. Verify meeting is in progress, Lightning Round complete
5. Reset to "Post-Meeting"
6. Verify meeting is completed with feedback data

### Test D: Meeting Date Shift

1. Reset to "RSVP -7 days"
2. Click "+3 days" to move meeting closer
3. Run "RSVP Escalation Check"
4. Verify escalation logic creates tasks

### Test E: Role Switching

1. Go to Oak Chapter page
2. Change role from Leader to Member
3. Verify UI changes (no Leader controls)
4. Change back to Leader

### Test F: Meeting Simulation

1. Reset to "Mostly Checked In"
2. Start the meeting flow
3. Use "Skip to Full Check-ins"
4. Verify Lightning Round data was generated
5. Use "Complete in 5 min" to simulate a check-in
6. Verify time log was created

### Test G: Incognito Login

1. Open incognito window
2. Go to login page
3. Log in as apollo@test.punc / testpass123
4. Verify you see Oak Chapter as backup_leader
5. Verify no Tester Panel (Apollo is not a tester)

---

## Session 8 Success Criteria

- [ ] is_tester and is_punc_admin flags on users table
- [ ] Nathan's account has both flags set
- [ ] Tester Panel component displays when is_tester = true
- [ ] Tester Panel shows current context (page, chapter, role, meeting)
- [ ] Database reset buttons work for all 9 states
- [ ] Reset clears data and seeds fresh state
- [ ] Meeting date shift works (now, +15min, +1day, +3days, +7days)
- [ ] Role change actually updates chapter_memberships
- [ ] Escalation check can be triggered manually
- [ ] Simulate check-in writes realistic time log
- [ ] Skip to section generates data for skipped sections
- [ ] Test users can log in with testpass123
- [ ] 30 test users with Greek mythology names created
- [ ] 3 chapters in Denver area created
- [ ] admin-overview state has 3 completed + 2 scheduled meetings per chapter
- [ ] All seed states are idempotent (can run multiple times)

---

## Seed States Reference

| State | Description | Good For Testing |
|-------|-------------|------------------|
| `three-chapters` | Oak (8), Pine (12), Elm (5), Nathan in Oak+Pine | Base state for most testing |
| `rsvp-one-week-oak` | Oak meeting +7 days, no RSVPs yet | RSVP task creation |
| `rsvp-one-day-oak` | Oak meeting +1 day, 2 unresponsive | Escalation, leader outreach |
| `pre-meeting-oak` | Oak meeting "now", all RSVP'd | Meeting start flow |
| `mostly-checked-in-oak` | Oak in progress, 7/8 checked in | Late arrival handling |
| `mid-meeting-oak` | Oak in progress, Lightning done | Full check-ins flow |
| `post-meeting-oak` | Oak completed with full data | Summary, commitments |
| `onboarding-queue` | 10 unassigned users in Denver | Chapter formation |
| `admin-overview` | All chapters with history | PUNC Admin testing |

---

## Notes for Session 9: PUNC Admin

With testing infrastructure in place, Session 9 can build:
- Admin dashboard with chapter overview
- User management (view, assign to chapters)
- Leadership log viewer
- Curriculum management (CRUD)
- Validation queue for completed meetings

The testing infrastructure makes it easy to verify admin functions work correctly across different data states.

---

**Test with confidence. Reset with ease.**