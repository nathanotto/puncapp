'use client';

import { useState, useEffect, useRef } from 'react';

type Module = {
  id: string;
  title: string;
  principle: string;
  is_meeting_only: boolean;
  assignment_text?: string;
};

type Props = {
  modules: Module[];
  onSelect: (moduleId: string) => void;
  onClose: () => void;
};

export default function AddModuleDropdown({ modules, onSelect, onClose }: Props) {
  const [search, setSearch] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);

  // Filter modules by search
  const filteredModules = modules.filter(m =>
    m.title.toLowerCase().includes(search.toLowerCase()) ||
    m.principle.toLowerCase().includes(search.toLowerCase())
  );

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div
        ref={modalRef}
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
      >
        {/* Header */}
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-xl font-semibold">Add Module to Sequence</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search Input */}
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search modules..."
            className="w-full px-3 py-2 border border-gray-300 rounded"
            autoFocus
          />
        </div>

        {/* Module List */}
        <div className="flex-1 overflow-y-auto p-4">
          {modules.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              All modules are already in this sequence.
            </p>
          ) : filteredModules.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              No modules match your search.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredModules.map(module => (
                <button
                  key={module.id}
                  onClick={() => onSelect(module.id)}
                  className="w-full text-left p-3 bg-gray-50 hover:bg-blue-50 rounded border border-gray-200 hover:border-blue-300 transition-colors"
                >
                  <div className="flex items-center gap-2 mb-1">
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
                  <p className="text-sm text-gray-600">
                    {module.principle.length > 120
                      ? module.principle.substring(0, 120) + '...'
                      : module.principle}
                  </p>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
