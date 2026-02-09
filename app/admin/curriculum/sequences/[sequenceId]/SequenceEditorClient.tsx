'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import AddModuleDropdown from '@/components/admin/AddModuleDropdown';

type Module = {
  id: string;
  title: string;
  principle: string;
  is_meeting_only: boolean;
  assignment_text?: string;
};

type ModuleInSequence = Module & {
  linkId: string;
  order: number;
};

type Sequence = {
  id: string;
  title: string;
  description: string;
  order_index: number;
  is_active: boolean;
};

type Props = {
  sequence: Sequence | null;
  modules: ModuleInSequence[];
  allModules: Module[];
};

export default function SequenceEditorClient({ sequence, modules: initialModules, allModules }: Props) {
  const router = useRouter();
  const [title, setTitle] = useState(sequence?.title || '');
  const [description, setDescription] = useState(sequence?.description || '');
  const [orderIndex, setOrderIndex] = useState(sequence?.order_index || 0);
  const [isActive, setIsActive] = useState(sequence?.is_active ?? true);
  const [modules, setModules] = useState<ModuleInSequence[]>(initialModules);
  const [saving, setSaving] = useState(false);
  const [showAddModule, setShowAddModule] = useState(false);

  const isNew = !sequence;

  // Filter out modules already in sequence
  const availableModules = allModules.filter(
    m => !modules.find(sm => sm.id === m.id)
  );

  const handleSave = async () => {
    if (!title.trim()) {
      alert('Title is required');
      return;
    }

    setSaving(true);

    try {
      if (isNew) {
        // Create new sequence
        const res = await fetch('/api/admin/curriculum/sequences', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            order_index: orderIndex,
            is_active: isActive,
          }),
        });

        if (!res.ok) throw new Error('Failed to create sequence');
        const data = await res.json();
        router.push(`/admin/curriculum/sequences/${data.id}`);
      } else {
        // Update existing sequence
        const res = await fetch(`/api/admin/curriculum/sequences/${sequence.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            description,
            order_index: orderIndex,
            is_active: isActive,
          }),
        });

        if (!res.ok) throw new Error('Failed to update sequence');
        router.refresh();
      }
    } catch (error) {
      console.error('Save error:', error);
      alert('Failed to save sequence');
    } finally {
      setSaving(false);
    }
  };

  const handleAddModule = async (moduleId: string) => {
    if (!sequence) return;

    try {
      const res = await fetch(`/api/admin/curriculum/sequences/${sequence.id}/modules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          module_id: moduleId,
          order_in_sequence: modules.length,
        }),
      });

      if (!res.ok) throw new Error('Failed to add module');
      router.refresh();
      setShowAddModule(false);
    } catch (error) {
      console.error('Add module error:', error);
      alert('Failed to add module');
    }
  };

  const handleRemoveModule = async (linkId: string, moduleTitle: string) => {
    if (!sequence) return;
    if (!confirm(`Remove "${moduleTitle}" from this sequence?`)) return;

    try {
      const res = await fetch(`/api/admin/curriculum/sequences/${sequence.id}/modules/${linkId}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to remove module');
      router.refresh();
    } catch (error) {
      console.error('Remove module error:', error);
      alert('Failed to remove module');
    }
  };

  const handleUpdateOrder = async (linkId: string, newOrder: number) => {
    if (!sequence) return;

    try {
      const res = await fetch(`/api/admin/curriculum/sequences/${sequence.id}/modules/${linkId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_in_sequence: newOrder }),
      });

      if (!res.ok) throw new Error('Failed to update order');
      router.refresh();
    } catch (error) {
      console.error('Update order error:', error);
      alert('Failed to update order');
    }
  };

  const handleDeactivate = async () => {
    if (!sequence) return;
    if (!confirm('Deactivate this sequence?')) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/curriculum/sequences/${sequence.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: false }),
      });

      if (!res.ok) throw new Error('Failed to deactivate');
      router.refresh();
    } catch (error) {
      console.error('Deactivate error:', error);
      alert('Failed to deactivate sequence');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!sequence) return;
    if (!confirm('Delete this sequence? This will remove all module associations.')) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/admin/curriculum/sequences/${sequence.id}`, {
        method: 'DELETE',
      });

      if (!res.ok) throw new Error('Failed to delete');
      router.push('/admin/curriculum');
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete sequence');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-4xl">
      {/* Form Fields */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 mb-6">
        <h2 className="text-xl font-semibold mb-4">Sequence Details</h2>

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
              placeholder="e.g., Foundation Sequence"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded"
              rows={3}
              placeholder="Brief description of this sequence..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Order Index</label>
            <input
              type="number"
              value={orderIndex}
              onChange={(e) => setOrderIndex(parseInt(e.target.value) || 0)}
              className="w-32 px-3 py-2 border border-gray-300 rounded"
            />
            <p className="text-sm text-gray-500 mt-1">
              Used for sorting sequences in the list
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

        <div className="flex gap-3 mt-6">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {saving ? 'Saving...' : isNew ? 'Create Sequence' : 'Save Changes'}
          </button>

          {!isNew && (
            <>
              <button
                onClick={handleDeactivate}
                disabled={saving || !isActive}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 disabled:bg-gray-400"
              >
                Deactivate
              </button>
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 border border-red-600 text-red-600 rounded hover:bg-red-50 disabled:opacity-50"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Module Management (only for existing sequences) */}
      {!isNew && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Modules in Sequence</h2>
            <button
              onClick={() => setShowAddModule(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
            >
              + Add Existing Module
            </button>
          </div>

          {modules.length === 0 ? (
            <p className="text-gray-500 text-sm">No modules in this sequence yet.</p>
          ) : (
            <div className="space-y-2">
              {modules.map((module) => (
                <div
                  key={module.linkId}
                  className="flex items-center gap-4 p-3 bg-gray-50 rounded border border-gray-200"
                >
                  <div className="w-20">
                    <input
                      type="number"
                      value={module.order}
                      onChange={(e) => {
                        const newOrder = parseInt(e.target.value);
                        if (!isNaN(newOrder)) {
                          handleUpdateOrder(module.linkId, newOrder);
                        }
                      }}
                      className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                      min="0"
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium">{module.title}</h3>
                      <div className="flex gap-1">
                        {module.is_meeting_only && (
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded">
                            Meeting Only
                          </span>
                        )}
                        {module.assignment_text && (
                          <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">
                            Has Assignment
                          </span>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-600 mt-0.5">
                      {module.principle.length > 80
                        ? module.principle.substring(0, 80) + '...'
                        : module.principle}
                    </p>
                  </div>
                  <button
                    onClick={() => handleRemoveModule(module.linkId, module.title)}
                    className="text-red-600 hover:underline text-sm"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add Module Dropdown */}
          {showAddModule && (
            <AddModuleDropdown
              modules={availableModules}
              onSelect={handleAddModule}
              onClose={() => setShowAddModule(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
