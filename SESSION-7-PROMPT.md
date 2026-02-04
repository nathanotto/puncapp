# PUNCapp Session 7: Curriculum & Closing

## Context

Session 6 built Full Check-ins with Stretch Goals and Support request flagging. Now we build the final two sections: Curriculum (if not ditched) and Closing, plus the meeting summary.

**Meeting structure reminder:**
1. ✅ Opening — Meditation, Ethos reading (Session 5)
2. ✅ Lightning Round — Each man ~1 min, priority assigned (Session 5)
3. ✅ Full Check-ins — Longer sharing, Stretch Goals, Support requests (Session 6)
4. **Curriculum — Educational content, reflection (Session 7) — if not ditched**
5. **Closing — Ratings, "most value", audio, Commitments (Session 7)**

**Session 7 scope:** Curriculum + Closing + Meeting Summary

## Primary References

1. **TOD-SPECIFICATION.md** — Flow 1: Meeting Cycle
2. **CLAUDE-CODE-GUIDE.md** — Implementation patterns
3. **SESSION-6-PROMPT.md** — Commitments table, Full Check-in flow

---

## Step 1: Create Curriculum Module Tables

```sql
-- Curriculum sequences (groups of modules, like courses)
CREATE TABLE curriculum_sequences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  order_index integer DEFAULT 0, -- for ordering sequences
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Individual curriculum modules
CREATE TABLE curriculum_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Content
  title text NOT NULL,
  principle text NOT NULL,
  description text NOT NULL,
  reflective_question text NOT NULL,
  exercise text NOT NULL,
  
  -- Sequence positioning
  sequence_id uuid REFERENCES curriculum_sequences(id),
  order_in_sequence integer DEFAULT 0,
  
  -- Status
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE curriculum_sequences ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_modules ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view curriculum
CREATE POLICY "Users can view curriculum sequences" ON curriculum_sequences
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view curriculum modules" ON curriculum_modules
  FOR SELECT USING (auth.role() = 'authenticated');

-- Only admins can manage (we'll add admin role later, for now allow authenticated)
CREATE POLICY "Authenticated can manage curriculum sequences" ON curriculum_sequences
  FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated can manage curriculum modules" ON curriculum_modules
  FOR ALL USING (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX idx_curriculum_modules_sequence ON curriculum_modules(sequence_id, order_in_sequence);
```

---

## Step 2: Create Curriculum Completion Tables

```sql
-- Chapter-level curriculum completion history
CREATE TABLE chapter_curriculum_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chapter_id uuid NOT NULL REFERENCES chapters(id) ON DELETE CASCADE,
  module_id uuid NOT NULL REFERENCES curriculum_modules(id),
  meeting_id uuid NOT NULL REFERENCES meetings(id),
  completed_at timestamptz DEFAULT now(),
  
  UNIQUE(chapter_id, module_id, meeting_id)
);

-- Individual member responses to reflective questions
CREATE TABLE curriculum_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  chapter_curriculum_history_id uuid NOT NULL REFERENCES chapter_curriculum_history(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id),
  meeting_id uuid NOT NULL REFERENCES meetings(id),
  module_id uuid NOT NULL REFERENCES curriculum_modules(id),
  
  -- The response
  response text NOT NULL, -- 1500 char limit enforced in app
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(meeting_id, module_id, user_id)
);

ALTER TABLE chapter_curriculum_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE curriculum_responses ENABLE ROW LEVEL SECURITY;

-- Users can view their chapter's history
CREATE POLICY "Users can view chapter curriculum history" ON chapter_curriculum_history
  FOR SELECT USING (
    chapter_id IN (
      SELECT chapter_id FROM chapter_memberships 
      WHERE user_id = auth.uid() AND is_active = true
    )
  );

-- Users can view their own responses
CREATE POLICY "Users can view own curriculum responses" ON curriculum_responses
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own responses
CREATE POLICY "Users can insert own curriculum responses" ON curriculum_responses
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Authenticated users can insert chapter history (Scribe does this)
CREATE POLICY "Authenticated can insert chapter curriculum history" ON chapter_curriculum_history
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX idx_chapter_curriculum_history_chapter ON chapter_curriculum_history(chapter_id);
CREATE INDEX idx_curriculum_responses_user ON curriculum_responses(user_id);
CREATE INDEX idx_curriculum_responses_meeting ON curriculum_responses(meeting_id);
```

---

## Step 3: Add Curriculum Selection to Meetings

```sql
-- Add selected curriculum module to meetings
ALTER TABLE meetings
  ADD COLUMN IF NOT EXISTS selected_curriculum_id uuid REFERENCES curriculum_modules(id);
```

---

## Step 4: Create Leader's Curriculum Selection Task

When a meeting is created (7 days out), create a task for the Leader to select curriculum.

```sql
-- This will be handled in the meeting creation logic
-- task_type = 'select_curriculum'
-- assigned_to = leader_id
-- due_date = meeting_date (can be done up until meeting)
```

Add to meeting creation logic (in the Edge Function or wherever meetings are scheduled):

```typescript
// When creating a meeting, also create curriculum selection task
await supabase.from('pending_tasks').insert({
  task_type: 'select_curriculum',
  assigned_to: leaderId,
  related_entity_type: 'meeting',
  related_entity_id: meetingId,
  due_date: meetingDate,
  metadata: {
    chapter_id: chapterId,
    chapter_name: chapterName,
  },
});
```

---

## Step 5: Build the Curriculum Selection Task Page

**`/app/tasks/meeting-cycle/select-curriculum/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function SelectCurriculumPage({
  searchParams,
}: {
  searchParams: { meetingId?: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect('/auth/login');
  
  const meetingId = searchParams.meetingId;
  if (!meetingId) {
    return <div className="p-8 text-red-600">Meeting ID required</div>;
  }
  
  // Get meeting and chapter info
  const { data: meeting } = await supabase
    .from('meetings')
    .select(`
      *,
      chapter:chapters(id, name),
      selected_curriculum:curriculum_modules(id, title)
    `)
    .eq('id', meetingId)
    .single();
  
  if (!meeting) {
    return <div className="p-8 text-red-600">Meeting not found</div>;
  }
  
  // Get chapter's curriculum history to find next suggested module
  const { data: chapterHistory } = await supabase
    .from('chapter_curriculum_history')
    .select('module_id')
    .eq('chapter_id', meeting.chapter_id);
  
  const completedModuleIds = new Set(chapterHistory?.map(h => h.module_id) || []);
  
  // Get all modules with their sequences
  const { data: modules } = await supabase
    .from('curriculum_modules')
    .select(`
      *,
      sequence:curriculum_sequences(id, title)
    `)
    .eq('is_active', true)
    .order('sequence_id')
    .order('order_in_sequence');
  
  // Find suggested next module (first uncompleted in sequence order)
  const suggestedModule = modules?.find(m => !completedModuleIds.has(m.id));
  
  return (
    <SelectCurriculumClient
      meeting={meeting}
      modules={modules || []}
      completedModuleIds={Array.from(completedModuleIds)}
      suggestedModuleId={suggestedModule?.id}
    />
  );
}
```

**`/components/tasks/SelectCurriculumClient.tsx`**

```typescript
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { selectCurriculum } from '@/app/tasks/meeting-cycle/select-curriculum/actions';

interface Module {
  id: string;
  title: string;
  principle: string;
  description: string;
  sequence: { id: string; title: string } | null;
}

interface SelectCurriculumClientProps {
  meeting: any;
  modules: Module[];
  completedModuleIds: string[];
  suggestedModuleId?: string;
}

export function SelectCurriculumClient({
  meeting,
  modules,
  completedModuleIds,
  suggestedModuleId,
}: SelectCurriculumClientProps) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState<string>(
    meeting.selected_curriculum_id || suggestedModuleId || ''
  );
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Group modules by sequence
  const modulesBySequence = modules.reduce((acc, module) => {
    const seqId = module.sequence?.id || 'none';
    const seqTitle = module.sequence?.title || 'Standalone Modules';
    if (!acc[seqId]) {
      acc[seqId] = { title: seqTitle, modules: [] };
    }
    acc[seqId].modules.push(module);
    return acc;
  }, {} as Record<string, { title: string; modules: Module[] }>);
  
  async function handleSubmit() {
    if (!selectedId) return;
    
    setIsSubmitting(true);
    try {
      await selectCurriculum(meeting.id, selectedId);
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to select curriculum:', error);
      setIsSubmitting(false);
    }
  }
  
  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Select Curriculum</h1>
        <p className="text-gray-600">
          {meeting.chapter.name} • {new Date(meeting.scheduled_date).toLocaleDateString()}
        </p>
      </div>
      
      {/* Current selection */}
      {meeting.selected_curriculum && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-green-600">Currently selected:</p>
          <p className="font-medium text-green-800">{meeting.selected_curriculum.title}</p>
        </div>
      )}
      
      {/* Suggested module */}
      {suggestedModuleId && !meeting.selected_curriculum_id && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <p className="text-sm text-blue-600">Suggested (next in sequence):</p>
          <p className="font-medium text-blue-800">
            {modules.find(m => m.id === suggestedModuleId)?.title}
          </p>
        </div>
      )}
      
      {/* Module list by sequence */}
      <div className="space-y-6">
        {Object.entries(modulesBySequence).map(([seqId, { title, modules: seqModules }]) => (
          <div key={seqId} className="border rounded-lg overflow-hidden">
            <div className="bg-gray-100 px-4 py-2 font-medium">
              {title}
            </div>
            <div className="divide-y">
              {seqModules.map(module => {
                const isCompleted = completedModuleIds.includes(module.id);
                const isSelected = selectedId === module.id;
                const isExpanded = expandedId === module.id;
                
                return (
                  <div
                    key={module.id}
                    className={`p-4 ${isSelected ? 'bg-blue-50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="curriculum"
                          checked={isSelected}
                          onChange={() => setSelectedId(module.id)}
                          className="w-4 h-4 text-blue-600"
                        />
                        <div>
                          <span className={`font-medium ${isCompleted ? 'text-gray-400' : ''}`}>
                            {module.title}
                          </span>
                          {isCompleted && (
                            <span className="ml-2 text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">
                              Completed
                            </span>
                          )}
                          {module.id === suggestedModuleId && (
                            <span className="ml-2 text-xs bg-blue-200 text-blue-700 px-2 py-0.5 rounded">
                              Suggested
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : module.id)}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        {isExpanded ? 'Hide' : 'Preview'}
                      </button>
                    </div>
                    
                    {isExpanded && (
                      <div className="mt-3 ml-7 p-3 bg-gray-50 rounded text-sm space-y-2">
                        <p><strong>Principle:</strong> {module.principle}</p>
                        <p><strong>Description:</strong> {module.description}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      
      {/* Submit button */}
      <div className="mt-6">
        <button
          onClick={handleSubmit}
          disabled={!selectedId || isSubmitting}
          className={`w-full py-3 rounded-lg font-medium ${
            selectedId && !isSubmitting
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {isSubmitting ? 'Saving...' : 'Select Curriculum'}
        </button>
      </div>
    </div>
  );
}
```

**`/app/tasks/meeting-cycle/select-curriculum/actions.ts`**

```typescript
'use server';

import { createClient } from '@/lib/supabase/server';
import { revalidatePath } from 'next/cache';

export async function selectCurriculum(meetingId: string, moduleId: string) {
  const supabase = await createClient();
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  
  // Update meeting with selected curriculum
  await supabase
    .from('meetings')
    .update({ selected_curriculum_id: moduleId })
    .eq('id', meetingId);
  
  // Complete the task
  await supabase
    .from('pending_tasks')
    .update({ completed_at: new Date().toISOString() })
    .eq('task_type', 'select_curriculum')
    .eq('related_entity_id', meetingId)
    .eq('assigned_to', user.id)
    .is('completed_at', null);
  
  revalidatePath('/dashboard');
  revalidatePath(`/meetings/${meetingId}`);
}
```

---

## Step 6: Build the Curriculum Section Component

**`/components/meeting/CurriculumSection.tsx`**

```typescript
'use client';

import { useState, useEffect } from 'react';

interface CurriculumModule {
  id: string;
  title: string;
  principle: string;
  description: string;
  reflective_question: string;
  exercise: string;
}

interface CurriculumSectionProps {
  meetingId: string;
  module: CurriculumModule;
  isScribe: boolean;
  userId: string;
  onComplete: () => void;
}

export function CurriculumSection({
  meetingId,
  module,
  isScribe,
  userId,
  onComplete,
}: CurriculumSectionProps) {
  const [timerSeconds, setTimerSeconds] = useState(30 * 60); // 30 minutes
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [response, setResponse] = useState('');
  const [hasSubmittedResponse, setHasSubmittedResponse] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Timer countdown
  useEffect(() => {
    if (!isTimerRunning) return;
    
    const interval = setInterval(() => {
      setTimerSeconds(prev => Math.max(0, prev - 1));
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isTimerRunning]);
  
  function formatTime(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  async function handleSubmitResponse() {
    if (response.length > 1500) return;
    
    setIsSubmitting(true);
    try {
      const res = await fetch('/api/curriculum/respond', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          moduleId: module.id,
          response: response.trim() || 'No response',
        }),
      });
      
      if (res.ok) {
        setHasSubmittedResponse(true);
      }
    } catch (error) {
      console.error('Failed to submit response:', error);
    }
    setIsSubmitting(false);
  }
  
  async function handleComplete() {
    await fetch('/api/curriculum/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ meetingId, moduleId: module.id }),
    });
    onComplete();
  }
  
  return (
    <div className="space-y-6">
      {/* Header with timer */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Curriculum</h2>
        <div className="text-right">
          <p className={`text-3xl font-mono font-bold ${timerSeconds < 300 ? 'text-orange-600' : ''}`}>
            {formatTime(timerSeconds)}
          </p>
          {isScribe && !isTimerRunning && (
            <button
              onClick={() => setIsTimerRunning(true)}
              className="mt-1 text-sm text-blue-600 hover:underline"
            >
              Start Timer
            </button>
          )}
        </div>
      </div>
      
      {/* Module content */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-6 space-y-4">
        <h3 className="text-lg font-bold text-amber-900">{module.title}</h3>
        
        <div>
          <p className="text-sm font-medium text-amber-700">Principle</p>
          <p className="text-amber-900">{module.principle}</p>
        </div>
        
        <div>
          <p className="text-sm font-medium text-amber-700">Description</p>
          <p className="text-amber-900">{module.description}</p>
        </div>
        
        <div>
          <p className="text-sm font-medium text-amber-700">Exercise</p>
          <p className="text-amber-900">{module.exercise}</p>
        </div>
      </div>
      
      {/* Reflective question and response */}
      <div className="bg-white border-2 border-amber-300 rounded-lg p-6">
        <p className="text-sm font-medium text-amber-700 mb-2">Reflective Question</p>
        <p className="text-lg font-medium text-amber-900 mb-4">{module.reflective_question}</p>
        
        {!hasSubmittedResponse ? (
          <div className="space-y-3">
            <textarea
              value={response}
              onChange={(e) => setResponse(e.target.value)}
              placeholder="Enter your response... (or leave blank for 'No response')"
              className="w-full p-3 border rounded-lg"
              rows={4}
              maxLength={1500}
            />
            <div className="flex justify-between items-center">
              <span className={`text-sm ${response.length > 1400 ? 'text-orange-600' : 'text-gray-500'}`}>
                {response.length}/1500 characters
              </span>
              <button
                onClick={handleSubmitResponse}
                disabled={isSubmitting}
                className="px-4 py-2 bg-amber-600 text-white rounded-lg font-medium hover:bg-amber-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Submitting...' : 'Submit Response'}
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-700">✓ Response submitted</p>
          </div>
        )}
      </div>
      
      {/* Scribe complete button */}
      {isScribe && (
        <div className="pt-4 border-t">
          <button
            onClick={handleComplete}
            className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
          >
            Complete Curriculum → Proceed to Closing
          </button>
        </div>
      )}
    </div>
  );
}
```

---

## Step 7: Create Curriculum API Routes

**`/app/api/curriculum/respond/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { meetingId, moduleId, response } = await request.json();
  
  // Validate response length
  if (response.length > 1500) {
    return NextResponse.json({ error: 'Response too long' }, { status: 400 });
  }
  
  // Get or create chapter_curriculum_history record
  const { data: meeting } = await supabase
    .from('meetings')
    .select('chapter_id')
    .eq('id', meetingId)
    .single();
  
  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }
  
  // Upsert chapter history
  const { data: history } = await supabase
    .from('chapter_curriculum_history')
    .upsert({
      chapter_id: meeting.chapter_id,
      module_id: moduleId,
      meeting_id: meetingId,
    }, {
      onConflict: 'chapter_id,module_id,meeting_id',
    })
    .select('id')
    .single();
  
  // Insert response
  await supabase
    .from('curriculum_responses')
    .upsert({
      chapter_curriculum_history_id: history?.id,
      user_id: user.id,
      meeting_id: meetingId,
      module_id: moduleId,
      response: response,
    }, {
      onConflict: 'meeting_id,module_id,user_id',
    });
  
  return NextResponse.json({ success: true });
}
```

**`/app/api/curriculum/complete/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { meetingId, moduleId } = await request.json();
  
  // Get meeting's chapter
  const { data: meeting } = await supabase
    .from('meetings')
    .select('chapter_id')
    .eq('id', meetingId)
    .single();
  
  if (!meeting) {
    return NextResponse.json({ error: 'Meeting not found' }, { status: 404 });
  }
  
  // Ensure chapter history record exists
  await supabase
    .from('chapter_curriculum_history')
    .upsert({
      chapter_id: meeting.chapter_id,
      module_id: moduleId,
      meeting_id: meetingId,
    }, {
      onConflict: 'chapter_id,module_id,meeting_id',
    });
  
  // Log curriculum section time
  const now = new Date().toISOString();
  await supabase.from('meeting_time_log').insert({
    meeting_id: meetingId,
    section: 'curriculum',
    start_time: now, // We don't have exact start, just mark completion
    end_time: now,
  });
  
  // Advance to closing
  await supabase
    .from('meetings')
    .update({ current_section: 'closing' })
    .eq('id', meetingId);
  
  return NextResponse.json({ success: true });
}
```

---

## Step 8: Create Closing Tables

```sql
-- Meeting ratings and "most value" selections
CREATE TABLE meeting_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id),
  
  -- Rating: 1-10, or null if "No response"
  value_rating integer CHECK (value_rating IS NULL OR (value_rating >= 1 AND value_rating <= 10)),
  skipped_rating boolean DEFAULT false,
  
  -- "Which man caused the most value for you?" (cannot be self)
  most_value_user_id uuid REFERENCES public.users(id),
  skipped_most_value boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(meeting_id, user_id)
);

-- Meeting audio recordings
CREATE TABLE meeting_recordings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id uuid NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  
  -- Storage
  storage_path text NOT NULL, -- path in Supabase storage
  duration_seconds integer,
  file_size_bytes integer,
  
  -- Metadata
  recorded_by uuid NOT NULL REFERENCES public.users(id), -- the Scribe
  recorded_at timestamptz DEFAULT now(),
  
  UNIQUE(meeting_id) -- one recording per meeting
);

ALTER TABLE meeting_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_recordings ENABLE ROW LEVEL SECURITY;

-- Users can view feedback for meetings they attended
CREATE POLICY "Users can view meeting feedback" ON meeting_feedback
  FOR SELECT USING (
    meeting_id IN (
      SELECT meeting_id FROM attendance WHERE user_id = auth.uid()
    )
  );

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON meeting_feedback
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can view recordings for meetings they attended
CREATE POLICY "Users can view meeting recordings" ON meeting_recordings
  FOR SELECT USING (
    meeting_id IN (
      SELECT meeting_id FROM attendance WHERE user_id = auth.uid()
    )
  );

-- Scribe can insert recordings
CREATE POLICY "Authenticated can insert recordings" ON meeting_recordings
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Indexes
CREATE INDEX idx_meeting_feedback_meeting ON meeting_feedback(meeting_id);
CREATE INDEX idx_meeting_feedback_most_value ON meeting_feedback(most_value_user_id) 
  WHERE most_value_user_id IS NOT NULL;
```

---

## Step 9: Set Up Supabase Storage for Audio

In Supabase Dashboard, create a storage bucket:

```sql
-- Create storage bucket for meeting recordings
INSERT INTO storage.buckets (id, name, public)
VALUES ('meeting-recordings', 'meeting-recordings', false);

-- Policy: authenticated users can upload
CREATE POLICY "Authenticated users can upload recordings"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'meeting-recordings');

-- Policy: users can view recordings for their meetings
CREATE POLICY "Users can view their meeting recordings"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'meeting-recordings' AND
  EXISTS (
    SELECT 1 FROM attendance a
    JOIN meetings m ON m.id = a.meeting_id
    WHERE a.user_id = auth.uid()
    AND storage.objects.name LIKE m.id || '%'
  )
);
```

---

## Step 10: Build the Closing Section Component

**`/components/meeting/ClosingSection.tsx`**

```typescript
'use client';

import { useState, useEffect, useRef } from 'react';

interface Attendee {
  user_id: string;
  user: {
    id: string;
    name: string;
    username: string | null;
  };
}

interface SupportRequest {
  user_id: string;
  user_name: string;
}

interface ClosingSectionProps {
  meetingId: string;
  attendees: Attendee[];
  supportRequests: SupportRequest[];
  isScribe: boolean;
  userId: string;
  onComplete: () => void;
}

export function ClosingSection({
  meetingId,
  attendees,
  supportRequests,
  isScribe,
  userId,
  onComplete,
}: ClosingSectionProps) {
  const [phase, setPhase] = useState<'support' | 'feedback' | 'recording' | 'done'>('support');
  
  // Feedback state
  const [valueRating, setValueRating] = useState<number | null>(null);
  const [skipRating, setSkipRating] = useState(false);
  const [mostValueUserId, setMostValueUserId] = useState<string | null>(null);
  const [skipMostValue, setSkipMostValue] = useState(false);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  
  // Recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [recordingBlob, setRecordingBlob] = useState<Blob | null>(null);
  const [recordingUploaded, setRecordingUploaded] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  
  // Recording timer
  useEffect(() => {
    if (!isRecording) return;
    
    const interval = setInterval(() => {
      setRecordingTime(prev => {
        if (prev >= 60) {
          // Auto-stop at 1 minute
          stopRecording();
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [isRecording]);
  
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setRecordingBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
    } catch (error) {
      console.error('Failed to start recording:', error);
      alert('Could not access microphone. Please check permissions.');
    }
  }
  
  function stopRecording() {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  }
  
  async function uploadRecording() {
    if (!recordingBlob) return;
    
    const formData = new FormData();
    formData.append('audio', recordingBlob, `meeting-${meetingId}.webm`);
    formData.append('meetingId', meetingId);
    formData.append('durationSeconds', recordingTime.toString());
    
    try {
      const res = await fetch('/api/meetings/recording', {
        method: 'POST',
        body: formData,
      });
      
      if (res.ok) {
        setRecordingUploaded(true);
      }
    } catch (error) {
      console.error('Failed to upload recording:', error);
    }
  }
  
  async function submitFeedback() {
    try {
      await fetch('/api/meetings/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meetingId,
          valueRating: skipRating ? null : valueRating,
          skippedRating: skipRating,
          mostValueUserId: skipMostValue ? null : mostValueUserId,
          skippedMostValue: skipMostValue,
        }),
      });
      setFeedbackSubmitted(true);
    } catch (error) {
      console.error('Failed to submit feedback:', error);
    }
  }
  
  function getDisplayName(attendee: Attendee): string {
    return attendee.user.username || attendee.user.name;
  }
  
  // Other attendees (excluding self) for "most value" selection
  const otherAttendees = attendees.filter(a => a.user_id !== userId);
  
  return (
    <div className="space-y-6">
      <h2 className="text-xl font-bold">Closing</h2>
      
      {/* Phase 1: Support Commitments */}
      {phase === 'support' && (
        <div className="space-y-4">
          {supportRequests.length > 0 ? (
            <>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-medium text-purple-800 mb-3">Support Requests</h3>
                <p className="text-sm text-purple-600 mb-4">
                  These men requested support during their check-in. 
                  Take a moment to make commitments to support them.
                </p>
                <ul className="space-y-2">
                  {supportRequests.map(req => (
                    <li key={req.user_id} className="flex items-center gap-2">
                      <span className="text-purple-600">•</span>
                      <span className="font-medium">{req.user_name}</span>
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="bg-white border rounded-lg p-4">
                <h4 className="font-medium mb-3">Make a Support Commitment</h4>
                <SupportCommitmentForm
                  meetingId={meetingId}
                  attendees={attendees}
                  userId={userId}
                />
              </div>
            </>
          ) : (
            <div className="bg-gray-50 border rounded-lg p-4 text-center text-gray-600">
              No support requests this meeting.
            </div>
          )}
          
          {isScribe && (
            <button
              onClick={() => setPhase('feedback')}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Proceed to Feedback →
            </button>
          )}
        </div>
      )}
      
      {/* Phase 2: Individual Feedback */}
      {phase === 'feedback' && (
        <div className="space-y-6">
          {!feedbackSubmitted ? (
            <>
              {/* Value Rating */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-medium mb-3">
                  On a scale of 1-10, how much value did you get from tonight's meeting?
                </h3>
                <p className="text-sm text-gray-500 mb-4">Be real.</p>
                
                {!skipRating ? (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <button
                        key={num}
                        onClick={() => setValueRating(num)}
                        className={`w-10 h-10 rounded-full font-bold ${
                          valueRating === num
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic mb-3">Skipped</p>
                )}
                
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={skipRating}
                    onChange={(e) => {
                      setSkipRating(e.target.checked);
                      if (e.target.checked) setValueRating(null);
                    }}
                  />
                  No response
                </label>
              </div>
              
              {/* Most Value Selection */}
              <div className="bg-white border rounded-lg p-4">
                <h3 className="font-medium mb-3">
                  Which man caused the most value for you at this meeting?
                </h3>
                <p className="text-sm text-gray-500 mb-4">
                  It might have been his presence, his words, his demonstration, a touch — anything.
                </p>
                
                {!skipMostValue ? (
                  <div className="space-y-2 mb-3">
                    {otherAttendees.map(attendee => (
                      <button
                        key={attendee.user_id}
                        onClick={() => setMostValueUserId(attendee.user_id)}
                        className={`w-full text-left p-3 rounded-lg border ${
                          mostValueUserId === attendee.user_id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:bg-gray-50'
                        }`}
                      >
                        {getDisplayName(attendee)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-400 italic mb-3">Skipped</p>
                )}
                
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={skipMostValue}
                    onChange={(e) => {
                      setSkipMostValue(e.target.checked);
                      if (e.target.checked) setMostValueUserId(null);
                    }}
                  />
                  No response
                </label>
              </div>
              
              {/* Submit Feedback */}
              <button
                onClick={submitFeedback}
                disabled={(!valueRating && !skipRating) || (!mostValueUserId && !skipMostValue)}
                className={`w-full py-3 rounded-lg font-medium ${
                  (valueRating || skipRating) && (mostValueUserId || skipMostValue)
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                Submit Feedback
              </button>
            </>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-green-700">✓ Feedback submitted</p>
            </div>
          )}
          
          {isScribe && (
            <button
              onClick={() => setPhase('recording')}
              className="w-full py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
            >
              Proceed to Audio Recording →
            </button>
          )}
        </div>
      )}
      
      {/* Phase 3: Audio Recording (Scribe only) */}
      {phase === 'recording' && (
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
            <h3 className="font-medium text-red-800 mb-2">Audio Recording</h3>
            <p className="text-sm text-red-600 mb-4">
              "What I got out of this meeting was..."
            </p>
            <p className="text-xs text-red-500 mb-4">Maximum 1 minute</p>
            
            {isScribe ? (
              <>
                {!recordingBlob ? (
                  <>
                    <div className="text-4xl font-mono font-bold text-red-800 mb-4">
                      {Math.floor(recordingTime / 60)}:{(recordingTime % 60).toString().padStart(2, '0')}
                    </div>
                    
                    {!isRecording ? (
                      <button
                        onClick={startRecording}
                        className="px-6 py-3 bg-red-600 text-white rounded-full font-medium hover:bg-red-700"
                      >
                        🎙️ Start Recording
                      </button>
                    ) : (
                      <button
                        onClick={stopRecording}
                        className="px-6 py-3 bg-gray-800 text-white rounded-full font-medium hover:bg-gray-900"
                      >
                        ⏹️ Stop Recording
                      </button>
                    )}
                  </>
                ) : (
                  <>
                    {!recordingUploaded ? (
                      <div className="space-y-3">
                        <p className="text-green-600">Recording complete ({recordingTime}s)</p>
                        <audio
                          controls
                          src={URL.createObjectURL(recordingBlob)}
                          className="mx-auto"
                        />
                        <div className="flex gap-3 justify-center">
                          <button
                            onClick={() => {
                              setRecordingBlob(null);
                              setRecordingTime(0);
                            }}
                            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg"
                          >
                            Re-record
                          </button>
                          <button
                            onClick={uploadRecording}
                            className="px-4 py-2 bg-green-600 text-white rounded-lg"
                          >
                            Save Recording
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-green-600">✓ Recording saved</p>
                    )}
                  </>
                )}
              </>
            ) : (
              <p className="text-gray-500">The Scribe is recording...</p>
            )}
          </div>
          
          {isScribe && (
            <button
              onClick={() => setPhase('done')}
              className="w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
            >
              Complete Meeting →
            </button>
          )}
        </div>
      )}
      
      {/* Phase 4: Done */}
      {phase === 'done' && isScribe && (
        <div className="text-center">
          <button
            onClick={onComplete}
            className="px-8 py-4 bg-green-600 text-white rounded-lg font-bold text-lg hover:bg-green-700"
          >
            End Meeting ✓
          </button>
        </div>
      )}
    </div>
  );
}

// Support Commitment Form Component
function SupportCommitmentForm({
  meetingId,
  attendees,
  userId,
}: {
  meetingId: string;
  attendees: Attendee[];
  userId: string;
}) {
  const [receiverId, setReceiverId] = useState('');
  const [description, setDescription] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const otherAttendees = attendees.filter(a => a.user_id !== userId);
  
  async function handleSubmit() {
    if (!receiverId || !description.trim()) return;
    
    setIsSubmitting(true);
    try {
      await fetch('/api/commitments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          commitmentType: 'support_a_man',
          receiverId,
          description: description.trim(),
          dueDate: dueDate || null,
          meetingId,
        }),
      });
      
      setSubmitted(true);
      setReceiverId('');
      setDescription('');
      setDueDate('');
      
      // Allow making more commitments
      setTimeout(() => setSubmitted(false), 2000);
    } catch (error) {
      console.error('Failed to create commitment:', error);
    }
    setIsSubmitting(false);
  }
  
  return (
    <div className="space-y-3">
      <select
        value={receiverId}
        onChange={(e) => setReceiverId(e.target.value)}
        className="w-full p-2 border rounded"
      >
        <option value="">Select who you're supporting...</option>
        {otherAttendees.map(a => (
          <option key={a.user_id} value={a.user_id}>
            {a.user.username || a.user.name}
          </option>
        ))}
      </select>
      
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="What are you committing to do?"
        className="w-full p-2 border rounded"
        rows={2}
      />
      
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="w-full p-2 border rounded"
        placeholder="Due date (optional)"
      />
      
      <button
        onClick={handleSubmit}
        disabled={!receiverId || !description.trim() || isSubmitting}
        className={`w-full py-2 rounded font-medium ${
          receiverId && description.trim() && !isSubmitting
            ? 'bg-purple-600 text-white hover:bg-purple-700'
            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
        }`}
      >
        {submitted ? '✓ Commitment Made' : isSubmitting ? 'Saving...' : 'Make Commitment'}
      </button>
    </div>
  );
}
```

---

## Step 11: Create Closing API Routes

**`/app/api/meetings/feedback/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { meetingId, valueRating, skippedRating, mostValueUserId, skippedMostValue } = await request.json();
  
  // Validate: can't select self for most value
  if (mostValueUserId === user.id) {
    return NextResponse.json({ error: 'Cannot select yourself' }, { status: 400 });
  }
  
  await supabase
    .from('meeting_feedback')
    .upsert({
      meeting_id: meetingId,
      user_id: user.id,
      value_rating: valueRating,
      skipped_rating: skippedRating,
      most_value_user_id: mostValueUserId,
      skipped_most_value: skippedMostValue,
    }, {
      onConflict: 'meeting_id,user_id',
    });
  
  return NextResponse.json({ success: true });
}
```

**`/app/api/meetings/recording/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const formData = await request.formData();
  const audioFile = formData.get('audio') as File;
  const meetingId = formData.get('meetingId') as string;
  const durationSeconds = parseInt(formData.get('durationSeconds') as string);
  
  if (!audioFile || !meetingId) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
  }
  
  // Upload to Supabase Storage
  const fileName = `${meetingId}/closing-${Date.now()}.webm`;
  const { error: uploadError } = await supabase.storage
    .from('meeting-recordings')
    .upload(fileName, audioFile);
  
  if (uploadError) {
    console.error('Upload error:', uploadError);
    return NextResponse.json({ error: 'Failed to upload' }, { status: 500 });
  }
  
  // Create database record
  await supabase.from('meeting_recordings').insert({
    meeting_id: meetingId,
    storage_path: fileName,
    duration_seconds: durationSeconds,
    file_size_bytes: audioFile.size,
    recorded_by: user.id,
  });
  
  return NextResponse.json({ success: true });
}
```

**`/app/api/commitments/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { commitmentType, receiverId, description, dueDate, meetingId, chapterId } = await request.json();
  
  const { data, error } = await supabase
    .from('commitments')
    .insert({
      committer_id: user.id,
      commitment_type: commitmentType,
      receiver_id: receiverId || null,
      description,
      due_date: dueDate || null,
      chapter_id: chapterId || null,
      created_at_meeting_id: meetingId || null,
    })
    .select('id')
    .single();
  
  if (error) {
    console.error('Commitment error:', error);
    return NextResponse.json({ error: 'Failed to create commitment' }, { status: 500 });
  }
  
  return NextResponse.json({ success: true, id: data.id });
}
```

---

## Step 12: Create Meeting End and Summary

**`/app/api/meetings/end/route.ts`**

```typescript
import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  
  const { meetingId } = await request.json();
  
  const now = new Date().toISOString();
  
  // Update meeting status
  await supabase
    .from('meetings')
    .update({
      status: 'completed',
      current_section: 'ended',
      completed_at: now,
    })
    .eq('id', meetingId);
  
  // Log closing section end
  await supabase.from('meeting_time_log').insert({
    meeting_id: meetingId,
    section: 'closing',
    start_time: now,
    end_time: now,
  });
  
  return NextResponse.json({ success: true });
}
```

**`/app/meetings/[meetingId]/summary/page.tsx`**

```typescript
import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

export default async function MeetingSummaryPage({
  params,
}: {
  params: { meetingId: string };
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) redirect('/auth/login');
  
  // Get meeting details
  const { data: meeting } = await supabase
    .from('meetings')
    .select(`
      *,
      chapter:chapters(name),
      selected_curriculum:curriculum_modules(title)
    `)
    .eq('id', params.meetingId)
    .single();
  
  if (!meeting) {
    return <div className="p-8 text-red-600">Meeting not found</div>;
  }
  
  // Get attendance
  const { data: attendance } = await supabase
    .from('attendance')
    .select(`
      *,
      user:users(name, username)
    `)
    .eq('meeting_id', params.meetingId)
    .not('checked_in_at', 'is', null);
  
  // Get time logs
  const { data: timeLogs } = await supabase
    .from('meeting_time_log')
    .select('*')
    .eq('meeting_id', params.meetingId);
  
  // Get support requests
  const supportRequests = timeLogs?.filter(l => 
    l.section === 'full_checkins' && l.requested_support
  ).length || 0;
  
  // Get commitments made
  const { data: commitments } = await supabase
    .from('commitments')
    .select(`
      *,
      committer:users!commitments_committer_id_fkey(name, username),
      receiver:users!commitments_receiver_id_fkey(name, username)
    `)
    .eq('created_at_meeting_id', params.meetingId);
  
  // Get feedback stats
  const { data: feedback } = await supabase
    .from('meeting_feedback')
    .select('value_rating')
    .eq('meeting_id', params.meetingId)
    .not('value_rating', 'is', null);
  
  const avgRating = feedback && feedback.length > 0
    ? (feedback.reduce((sum, f) => sum + (f.value_rating || 0), 0) / feedback.length).toFixed(1)
    : null;
  
  // Calculate duration
  const startTime = meeting.actual_start_time ? new Date(meeting.actual_start_time) : null;
  const endTime = meeting.completed_at ? new Date(meeting.completed_at) : null;
  const actualDuration = startTime && endTime
    ? Math.round((endTime.getTime() - startTime.getTime()) / 60000)
    : null;
  
  return (
    <div className="max-w-2xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-2">Meeting Summary</h1>
      <p className="text-gray-600 mb-6">
        {meeting.chapter.name} • {new Date(meeting.scheduled_date).toLocaleDateString()}
      </p>
      
      {/* Duration */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-500">Scheduled Duration</p>
            <p className="font-medium">{meeting.duration_minutes} min</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Actual Duration</p>
            <p className="font-medium">{actualDuration ? `${actualDuration} min` : '—'}</p>
          </div>
        </div>
      </div>
      
      {/* Attendance */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <h3 className="font-medium mb-3">Attendance ({attendance?.length || 0})</h3>
        <div className="flex flex-wrap gap-2">
          {attendance?.map(a => (
            <span key={a.user_id} className="px-2 py-1 bg-white rounded text-sm">
              {a.user.username || a.user.name}
            </span>
          ))}
        </div>
      </div>
      
      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div className="bg-blue-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{avgRating || '—'}</p>
          <p className="text-sm text-blue-600">Avg Rating</p>
        </div>
        <div className="bg-purple-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-purple-600">{supportRequests}</p>
          <p className="text-sm text-purple-600">Support Requests</p>
        </div>
        <div className="bg-green-50 rounded-lg p-4 text-center">
          <p className="text-2xl font-bold text-green-600">{commitments?.length || 0}</p>
          <p className="text-sm text-green-600">Commitments Made</p>
        </div>
      </div>
      
      {/* Curriculum */}
      {meeting.selected_curriculum && !meeting.curriculum_ditched && (
        <div className="bg-amber-50 rounded-lg p-4 mb-4">
          <h3 className="font-medium mb-1">Curriculum Completed</h3>
          <p className="text-amber-800">{meeting.selected_curriculum.title}</p>
        </div>
      )}
      {meeting.curriculum_ditched && (
        <div className="bg-gray-100 rounded-lg p-4 mb-4">
          <p className="text-gray-500">Curriculum was skipped this meeting</p>
        </div>
      )}
      
      {/* Commitments */}
      {commitments && commitments.length > 0 && (
        <div className="bg-white border rounded-lg p-4 mb-4">
          <h3 className="font-medium mb-3">Commitments Made</h3>
          <div className="space-y-3">
            {commitments.map(c => (
              <div key={c.id} className="p-3 bg-gray-50 rounded">
                <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                  <span className="capitalize">{c.commitment_type.replace('_', ' ')}</span>
                  {c.receiver && (
                    <>
                      <span>→</span>
                      <span>{c.receiver.username || c.receiver.name}</span>
                    </>
                  )}
                </div>
                <p className="font-medium">{c.description}</p>
                <p className="text-sm text-gray-500 mt-1">
                  by {c.committer.username || c.committer.name}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Back to dashboard */}
      <a
        href="/dashboard"
        className="block w-full text-center py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
      >
        Back to Dashboard
      </a>
    </div>
  );
}
```

---

## Step 13: Update Meeting Runner for Curriculum and Closing

Update **`/app/meetings/[meetingId]/run/page.tsx`** to include:

```typescript
// Add to imports
import { CurriculumSection } from '@/components/meeting/CurriculumSection';
import { ClosingSection } from '@/components/meeting/ClosingSection';

// In the JSX:

{meeting.current_section === 'curriculum' && meeting.selected_curriculum && (
  <CurriculumSection
    meetingId={params.meetingId}
    module={meeting.selected_curriculum}
    isScribe={isScribe}
    userId={user.id}
    onComplete={async () => {
      'use server';
      await advanceSection(params.meetingId, 'closing');
    }}
  />
)}

{meeting.current_section === 'closing' && (
  <ClosingSection
    meetingId={params.meetingId}
    attendees={attendees}
    supportRequests={supportRequestsList}
    isScribe={isScribe}
    userId={user.id}
    onComplete={async () => {
      'use server';
      await fetch('/api/meetings/end', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meetingId: params.meetingId }),
      });
      redirect(`/meetings/${params.meetingId}/summary`);
    }}
  />
)}
```

---

## Step 14: Add Seed Data for Curriculum

**`/scripts/seed-curriculum.sql`**

```sql
-- Create a test sequence
INSERT INTO curriculum_sequences (id, title, description, order_index)
VALUES (
  'seq-001',
  'Foundations of Brotherhood',
  'Core principles for new members',
  1
);

-- Create test modules
INSERT INTO curriculum_modules (id, title, principle, description, reflective_question, exercise, sequence_id, order_in_sequence)
VALUES 
  (
    'mod-001',
    'The Power of Presence',
    'Be in brotherhood',
    'Brotherhood begins with showing up—physically, emotionally, mentally. Your presence matters more than your performance.',
    'When was the last time you felt truly seen by another man? What made that moment significant?',
    'Pair up with another man. For 2 minutes each, simply look at each other without speaking. Notice what arises.',
    'seq-001',
    1
  ),
  (
    'mod-002', 
    'Fighting Hurt',
    'Fight hurt',
    'We fight hurt—in ourselves and in others. Not by avoiding pain, but by moving through it together.',
    'What hurt are you currently carrying that you have not shared with another man?',
    'Write down one hurt you are carrying. Share it with the group in one sentence.',
    'seq-001',
    2
  ),
  (
    'mod-003',
    'Dangerous Safety',
    'Be dangerous, but not a danger',
    'A man in his power is dangerous. He has the capacity to create and destroy. The key is channeling that power with wisdom.',
    'In what area of your life have you been playing it too safe? What would "dangerous" look like there?',
    'Stand up. Take up space. Let a sound come from deep in your chest. Feel your own power.',
    'seq-001',
    3
  );
```

---

## Step 15: Test the Complete Flow

### Test A: Curriculum Selection Task

1. Create a meeting 7 days out
2. See "Select Curriculum" task on Leader's dashboard
3. Complete the task, select a module
4. Verify meeting has selected_curriculum_id

### Test B: Curriculum Section

1. Complete Full Check-ins (from Session 6)
2. Section advances to Curriculum
3. See module content: principle, description, exercise
4. See reflective question
5. Enter response (test character limit)
6. Scribe completes curriculum
7. Section advances to Closing

### Test C: Closing - Support Commitments

1. (Have someone request support in Full Check-ins)
2. In Closing, see support requests listed
3. Make a support commitment
4. Verify receiver sees it (real-time if possible)

### Test D: Closing - Feedback

1. Enter 1-10 rating
2. Select "most value" (verify can't select self)
3. Test "No response" option
4. Submit feedback

### Test E: Closing - Audio Recording

1. As Scribe, start recording
2. Speak for a few seconds
3. Stop recording
4. Preview playback
5. Save recording
6. Verify uploaded to Supabase Storage

### Test F: Meeting End and Summary

1. Scribe clicks "End Meeting"
2. Redirected to summary page
3. See all stats: duration, attendance, avg rating, commitments
4. Back to dashboard

---

## Session 7 Success Criteria

- [ ] Curriculum tables created (sequences, modules, history, responses)
- [ ] Leader can select curriculum module before meeting
- [ ] Curriculum section displays module content
- [ ] Men can enter reflective question responses (1500 char limit)
- [ ] Responses saved to curriculum_responses
- [ ] Chapter curriculum history tracked
- [ ] Closing section has Support Commitments phase
- [ ] Support commitments can be created
- [ ] Feedback phase: 1-10 rating works
- [ ] Feedback phase: "Most value" selection works (can't select self)
- [ ] "No response" option works for both
- [ ] Audio recording works (1 min max)
- [ ] Recording uploads to Supabase Storage
- [ ] Meeting can be ended
- [ ] Summary page shows all stats
- [ ] Meeting status changes to 'completed'

---

## What's Next After Session 7

The core meeting flow is complete! Future sessions could cover:

- **Member Onboarding** — new member signup, chapter assignment
- **Chapter Management** — creating chapters, splitting chapters
- **Commitment Lifecycle** — dashboard views, completion tracking, reminders
- **PUNC Admin** — curriculum management, leadership logs, analytics
- **Notifications** — real Resend/Twilio integration
- **Mobile optimization** — PWA, offline support

---

**Congratulations — PUNCapp has a complete meeting cycle!**
