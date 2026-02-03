import Link from 'next/link';
import { ActionResult } from '@/lib/task-utils';

interface TaskConfirmationProps {
  result: ActionResult;
}

export default function TaskConfirmation({ result }: TaskConfirmationProps) {
  return (
    <div className="bg-white rounded-lg p-8 text-center max-w-2xl mx-auto">
      {/* Success Icon */}
      <div className="mb-6">
        <div className="w-16 h-16 bg-green-100 rounded-full mx-auto flex items-center justify-center">
          <svg
            className="w-8 h-8 text-green-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M5 13l4 4L19 7"
            />
          </svg>
        </div>
      </div>

      {/* Message - What happened */}
      <h2 className="text-2xl font-bold text-earth-brown mb-3">
        {result.message}
      </h2>

      {/* Consequence - What it means */}
      <p className="text-lg text-stone-gray mb-6">
        {result.consequence}
      </p>

      {/* Downstream Effects - What tasks were triggered for others */}
      {result.downstream && result.downstream.length > 0 && (
        <div className="bg-bg-subtle rounded-lg p-4 mb-6 text-left">
          <h3 className="font-semibold text-earth-brown mb-2 text-sm uppercase tracking-wide">
            What Happens Next
          </h3>
          <ul className="space-y-1">
            {result.downstream.map((effect, index) => (
              <li key={index} className="text-sm text-stone-gray flex items-start">
                <span className="mr-2">•</span>
                <span>{effect}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Next Step */}
      {result.nextStep && (
        <div className="mt-6">
          <p className="text-sm text-stone-gray mb-3">
            {result.nextStep.description}
          </p>
          {result.nextStep.href && result.nextStep.label && (
            <Link href={result.nextStep.href}>
              <button className="bg-burnt-orange text-white py-3 px-6 rounded-lg font-semibold hover:bg-burnt-orange/90 transition-colors">
                {result.nextStep.label}
              </button>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
