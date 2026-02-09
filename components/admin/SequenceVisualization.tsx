'use client';

type Module = {
  id: string;
  title: string;
  description: string;
  principle: string;
  is_meeting_only: boolean;
  assignment_text?: string;
};

type ModuleWithOrder = Module & {
  order: number;
};

type Sequence = {
  id: string;
  title: string;
  description?: string;
};

type Props = {
  sequence: Sequence;
  modules: ModuleWithOrder[];
  showFullDescription?: boolean;
  showCompletionStatus?: boolean;
  completionData?: {
    moduleId: string;
    completedCount: number;
    totalMembers: number;
  }[];
  className?: string;
};

export default function SequenceVisualization({
  sequence,
  modules,
  showFullDescription = false,
  showCompletionStatus = false,
  completionData = [],
  className = '',
}: Props) {
  const getCompletionStats = (moduleId: string) => {
    if (!showCompletionStatus) return null;
    const stats = completionData.find(cd => cd.moduleId === moduleId);
    return stats || { completedCount: 0, totalMembers: 0 };
  };

  const sortedModules = [...modules].sort((a, b) => a.order - b.order);

  return (
    <div className={`bg-white border border-gray-200 rounded-lg shadow-sm ${className}`}>
      {/* Sequence Header */}
      <div className="border-b border-gray-200 p-4 bg-gray-50">
        <h2 className="text-xl font-bold">{sequence.title}</h2>
        {sequence.description && (
          <p className="text-gray-600 text-sm mt-1">{sequence.description}</p>
        )}
        <p className="text-gray-500 text-xs mt-2">
          {modules.length} {modules.length === 1 ? 'module' : 'modules'}
        </p>
      </div>

      {/* Module List */}
      <div className="divide-y divide-gray-200">
        {sortedModules.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            No modules in this sequence yet.
          </div>
        ) : (
          sortedModules.map((module, index) => {
            const completionStats = getCompletionStats(module.id);
            const completionPercent = completionStats && completionStats.totalMembers > 0
              ? Math.round((completionStats.completedCount / completionStats.totalMembers) * 100)
              : 0;

            return (
              <div key={module.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex gap-4">
                  {/* Order Number */}
                  <div className="flex-shrink-0 w-10 h-10 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center font-bold">
                    {index + 1}
                  </div>

                  {/* Module Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex-1">
                        <h3 className="font-semibold text-lg">{module.title}</h3>
                        <p className="text-sm text-blue-600 italic mt-0.5">
                          {module.principle}
                        </p>
                      </div>

                      {/* Badges */}
                      <div className="flex gap-1 flex-shrink-0">
                        {module.is_meeting_only && (
                          <span className="px-2 py-0.5 text-xs bg-purple-100 text-purple-700 rounded whitespace-nowrap">
                            Meeting Only
                          </span>
                        )}
                        {module.assignment_text && (
                          <span className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded whitespace-nowrap">
                            Has Assignment
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-gray-700 text-sm">
                      {showFullDescription
                        ? module.description
                        : module.description.length > 200
                        ? module.description.substring(0, 200) + '...'
                        : module.description}
                    </p>

                    {/* Completion Status (Optional) */}
                    {showCompletionStatus && completionStats && (
                      <div className="mt-3">
                        <div className="flex items-center gap-3">
                          <div className="flex-1 bg-gray-200 rounded-full h-2">
                            <div
                              className="bg-green-500 h-2 rounded-full transition-all"
                              style={{ width: `${completionPercent}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600 whitespace-nowrap">
                            {completionStats.completedCount}/{completionStats.totalMembers} completed
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
