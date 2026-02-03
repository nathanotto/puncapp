'use client';

import { ReactNode, useState } from 'react';
import TaskPrompt from './TaskPrompt';
import TaskContext from './TaskContext';
import TaskActions from './TaskActions';
import TaskConfirmation from './TaskConfirmation';
import TaskError from './TaskError';
import { ActionResult } from '@/lib/task-utils';

type TaskState = 'idle' | 'loading' | 'success' | 'error';

interface TaskAction {
  label: string;
  onClick: () => void | Promise<void>;
  variant?: 'primary' | 'secondary' | 'tertiary';
}

interface TaskScreenProps {
  prompt: {
    title: string;
    subtitle?: string;
  };
  context: ReactNode;
  primaryAction: TaskAction;
  secondaryActions?: TaskAction[];
  onExecute: () => Promise<ActionResult>;
  isDisabled?: boolean;
  currentUserName?: string;
}

export default function TaskScreen({
  prompt,
  context,
  primaryAction,
  secondaryActions = [],
  onExecute,
  isDisabled = false,
  currentUserName
}: TaskScreenProps) {
  const [state, setState] = useState<TaskState>('idle');
  const [result, setResult] = useState<ActionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handlePrimaryAction = async () => {
    setState('loading');
    setError(null);

    try {
      const actionResult = await onExecute();

      if (actionResult.success) {
        setResult(actionResult);
        setState('success');
      } else {
        setError(actionResult.message);
        setState('error');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setState('error');
    }
  };

  const handleRetry = () => {
    setState('idle');
    setError(null);
  };

  // Show confirmation screen after successful completion
  if (state === 'success' && result) {
    return (
      <div className="min-h-screen bg-warm-cream py-12 px-6">
        <TaskConfirmation result={result} />
      </div>
    );
  }

  // Show main task screen (idle, loading, or error)
  return (
    <div className="min-h-screen bg-warm-cream">
      {/* Header with user info */}
      {currentUserName && (
        <header className="bg-deep-charcoal text-warm-cream py-6 px-6">
          <div className="max-w-3xl mx-auto flex justify-between items-center">
            <a href="/" className="text-sm text-warm-cream/80 hover:text-warm-cream">
              ← Back to Dashboard
            </a>
            <div className="text-right text-sm">
              <p className="text-warm-cream/80">{currentUserName}</p>
              <a href="/auth/logout" className="text-warm-cream/60 hover:text-warm-cream">
                Sign Out
              </a>
            </div>
          </div>
        </header>
      )}

      <div className={currentUserName ? "py-8 px-6" : "py-12 px-6"}>
        <div className="max-w-3xl mx-auto">
          <TaskPrompt title={prompt.title} subtitle={prompt.subtitle} />

          <TaskContext>
            {context}
          </TaskContext>

          {state === 'error' && error && (
            <div className="mb-6">
              <TaskError error={error} onRetry={handleRetry} />
            </div>
          )}

          <TaskActions
            primaryAction={{
              ...primaryAction,
              onClick: handlePrimaryAction
            }}
            secondaryActions={secondaryActions}
            isLoading={state === 'loading'}
            isDisabled={isDisabled}
          />
        </div>
      </div>
    </div>
  );
}
