import Link from 'next/link';

interface TaskNotAvailableProps {
  reason: string;
  suggestion?: {
    description: string;
    href?: string;
    label?: string;
  };
}

export default function TaskNotAvailable({ reason, suggestion }: TaskNotAvailableProps) {
  return (
    <div className="bg-warm-cream rounded-lg p-8 text-center max-w-2xl mx-auto">
      {/* Info Icon */}
      <div className="mb-6">
        <div className="w-16 h-16 bg-stone-gray/20 rounded-full mx-auto flex items-center justify-center">
          <svg
            className="w-8 h-8 text-stone-gray"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>
      </div>

      {/* Reason */}
      <h2 className="text-2xl font-bold text-earth-brown mb-3">
        This task isn't available
      </h2>
      <p className="text-lg text-stone-gray mb-6">
        {reason}
      </p>

      {/* Suggestion */}
      {suggestion && (
        <div className="bg-white rounded-lg p-4 mb-6">
          <p className="text-sm text-stone-gray mb-3">
            {suggestion.description}
          </p>
          {suggestion.href && suggestion.label && (
            <Link href={suggestion.href}>
              <button className="bg-burnt-orange text-white py-2 px-4 rounded-lg font-medium hover:bg-burnt-orange/90 transition-colors">
                {suggestion.label}
              </button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
