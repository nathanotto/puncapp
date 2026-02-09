'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Sequence = {
  id: string;
  title: string;
  description: string;
};

type SequenceWithLink = Sequence & {
  linkId: string;
  order: number;
};

type Module = {
  id: string;
  title: string;
  principle: string;
  description: string;
  reflective_question: string;
  exercise: string;
  assignment_text?: string;
  assignment_due_days: number;
  is_meeting_only: boolean;
  is_active: boolean;
};

type Props = {
  module: Module | null;
  sequences: SequenceWithLink[];
  allSequences: Sequence[];
};

export default function ModuleEditorClient({ module, sequences: initialSequences, allSequences }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(module?.title || '');
  const [principle, setPrinciple] = useState(module?.principle || '');
  const [description, setDescription] = useState(module?.description || '');
  const [reflectiveQuestion, setReflectiveQuestion] = useState(module?.reflective_question || '');
  const [exercise, setExercise] = useState(module?.exercise || '');
  const [assignmentText, setAssignmentText] = useState(module?.assignment_text || '');
  const [assignmentDueDays, setAssignmentDueDays] = useState(module?.assignment_due_days || 14);
  const [isMeetingOnly, setIsMeetingOnly] = useState(module?.is_meeting_only ?? true);
  const [isActive, setIsActive] = useState(module?.is_active ?? true);
  const [sequences, setSequences] = useState<SequenceWithLink[]>(initialSequences);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [showAddSequence, setShowAddSequence] = useState(false);

  const isNew = !module;

  // Filter out sequences already containing this module
  const availableSequences = allSequences.filter(
    s => !sequences.find(ms => ms.id === s.id)
  );

  const handleSave = async () => {
    if (!title.trim() || !principle.trim() || !description.trim() || !reflectiveQuestion.trim() || !exercise.trim()) {
      alert('All module content fields are required');
      return;
    }

    setSaving(true);

    try {
      if (isNew) {
        // Create new module
        const res = await fetch('/api/admin/curriculum/modules', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            principle,
            description,
            reflective_question: reflectiveQuestion,
            exercise,
            assignment_text: assignmentText || null,
            assignment_due_days: assignmentDueDays,
            is_meeting_only: isMeetingOnly,
            is_active: isActive,
          }),
        });

        if (!res.ok) throw new Error('Failed to create module');
        const data = await res.json();
        router.push(`/admin/curriculum/modules/${data.id}`);
      } else {
        // Update existing module
        const res = await fetch(`/api/admin/curriculum/modules/${module.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            principle,
            description,
            reflective_question: reflectiveQuestion,
            exercise,
            assignment_text: assignmentText || null,
            assignment_due_days: assignmentDueDays,
            is_meeting_only: isMeetingOnly,
            is_active: isActive,
          }),
        });

        if (!res.ok) throw new Error('Failed to update module');
        router.refresh();
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save module');
    } finally {
      setSaving(false);
    }
  };

  const handleDeactivate = async () => {
    if (!module) return;
    if (!confirm('Deactivate this module?')) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/curriculum/modules/${module.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });

      if (!res.ok) throw new Error('Failed to deactivate');
      router.refresh();
    } catch (error) {
      console.error('Deactivate error:', error);
      alert('Failed to deactivate module');
    } finally {
      setSaving(false);
    }
  };

  const handleAddToSequence = async (sequenceId: string) => {
    if (!module) return;

    try {
      const res = await fetch(`/api/admin/curriculum/sequences/${sequenceId}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: module.id,
          order_in_sequence: 999, // Add to end
        }),
      });

      if (!res.ok) throw new Error('Failed to add to sequence');
      router.refresh();
      setShowAddSequence(false);
    } catch (error) {
      console.error('Add to sequence error:', error);
      alert('Failed to add to sequence');
    }
  };

  const handleRemoveFromSequence = async (linkId: string, sequenceTitle: string) => {
    if (!module) return;
    if (!confirm(`Remove from "${sequenceTitle}"?`)) return;

    try {
      const res = await fetch(`/api/admin/curriculum/sequences/${module.id}/modules/${linkId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to remove from sequence');
      router.refresh();
    } catch (error) {
      console.error('Remove from sequence error:', error);
      alert('Failed to remove from sequence');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Form (2/3 width) */}
      <div className="lg:col-span-2 space-y-6">
        {/* Module Content */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Module Content</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="e.g., The Power of Presence"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Principle <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={principle}
                onChange={(e) => setPrinciple(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                placeholder="Short principle statement"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                rows={4}
                placeholder="Detailed description of the module..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Reflective Question <span className="text-red-500">*</span>
              </label>
              <textarea
                value={reflectiveQuestion}
                onChange={(e) => setReflectiveQuestion(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                rows={3}
                placeholder="Question for members to reflect on..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Exercise <span className="text-red-500">*</span>
              </label>
              <textarea
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                rows={4}
                placeholder="Exercise instructions..."
              />
            </div>
          </div>
        </div>

        {/* Assignment (Optional) */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Assignment (Optional)</h2>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Assignment Text</label>
              <textarea
                value={assignmentText}
                onChange={(e) => setAssignmentText(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded"
                rows={4}
                placeholder="If filled, module will have an assignment..."
              />
              <p className="text-sm text-gray-500 mt-1">
                Leave empty if this module has no assignment
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Default Due Days</label>
              <input
                type="number"
                value={assignmentDueDays}
                onChange={(e) => setAssignmentDueDays(parseInt(e.target.value) || 14)}
                className="w-32 px-3 py-2 border border-gray-300 rounded"
                min="1"
              />
              <p className="text-sm text-gray-500 mt-1">
                Days after meeting for assignment completion
              </p>
            </div>
          </div>
        </div>

        {/* Settings */}
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Settings</h2>

          <div className="space-y-3">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isMeetingOnly}
                  onChange={(e) => setIsMeetingOnly(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium">Meeting Only</span>
              </label>
              <p className="text-sm text-gray-500 ml-6">
                If unchecked, can be completed via self-study
              </p>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="rounded"
                />
                <span className="text-sm font-medium">Active</span>
              </label>
            </div>
          </div>
        </div>

        {/* Sequences (only for existing modules) */}
        {!isNew && (
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Sequences</h2>
              <button
                onClick={() => setShowAddSequence(true)}
                className="text-blue-600 hover:underline text-sm"
              >
                + Add to Sequence
              </button>
            </div>

            {sequences.length === 0 ? (
              <p className="text-gray-500 text-sm">Not in any sequence yet.</p>
            ) : (
              <div className="space-y-2">
                {sequences.map(seq => (
                  <div
                    key={seq.linkId}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200"
                  >
                    <div>
                      <h3 className="font-medium">{seq.title}</h3>
                      <p className="text-sm text-gray-600">Order: {seq.order}</p>
                    </div>
                    <button
                      onClick={() => handleRemoveFromSequence(seq.linkId, seq.title)}
                      className="text-red-600 hover:underline text-sm"
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add to Sequence Dropdown */}
            {showAddSequence && (
              <div className="mt-4 border-t border-gray-200 pt-4">
                <h3 className="text-sm font-medium mb-2">Add to Sequence:</h3>
                {availableSequences.length === 0 ? (
                  <p className="text-sm text-gray-500">Already in all sequences.</p>
                ) : (
                  <div className="space-y-1">
                    {availableSequences.map(seq => (
                      <button
                        key={seq.id}
                        onClick={() => handleAddToSequence(seq.id)}
                        className="w-full text-left p-2 hover:bg-blue-50 rounded border border-gray-200"
                      >
                        <div className="font-medium">{seq.title}</div>
                        {seq.description && (
                          <div className="text-sm text-gray-600">{seq.description}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
                <button
                  onClick={() => setShowAddSequence(false)}
                  className="mt-2 text-sm text-gray-600 hover:underline"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : isNew ? 'Create Module' : 'Save Changes'}
          </button>

          {!isNew && (
            <button
              onClick={handleDeactivate}
              disabled={saving || !isActive}
              className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
            >
              Deactivate
            </button>
          )}
        </div>
      </div>

      {/* Preview Sidebar (1/3 width) */}
      <div className="lg:col-span-1">
        <div className="bg-white border border-gray-200 rounded-lg p-6 sticky top-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Preview</h2>
            <button
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm text-blue-600 hover:underline"
            >
              {showPreview ? 'Hide' : 'Show'}
            </button>
          </div>

          {showPreview && (
            <div className="space-y-4 text-sm">
              <div>
                <h3 className="text-2xl font-bold mb-2">{title || 'Module Title'}</h3>
                <p className="text-lg font-medium text-blue-600 italic">
                  {principle || 'Principle statement'}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Description</h4>
                <p className="text-gray-700">{description || 'Module description...'}</p>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Reflective Question</h4>
                <p className="text-gray-700 bg-blue-50 p-3 rounded">
                  {reflectiveQuestion || 'Reflective question...'}
                </p>
              </div>

              <div>
                <h4 className="font-semibold mb-1">Exercise</h4>
                <p className="text-gray-700">{exercise || 'Exercise instructions...'}</p>
              </div>

              {assignmentText && (
                <div>
                  <h4 className="font-semibold mb-1">Assignment</h4>
                  <p className="text-gray-700 bg-amber-50 p-3 rounded">
                    {assignmentText}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Due: {assignmentDueDays} days after meeting
                  </p>
                </div>
              )}
            </div>
          )}

          {!showPreview && (
            <p className="text-sm text-gray-500">
              Click "Show" to see how this module will appear to members during a meeting.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
