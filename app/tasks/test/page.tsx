'use client';

import TaskScreen from '@/components/task/TaskScreen';
import { createTaskResult, ActionResult } from '@/lib/task-utils';

export default function TestTaskPage() {
  const handleExecute = async (): Promise<ActionResult> => {
    // Simulate API call with 1 second delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Return a success result
    return createTaskResult({
      success: true,
      message: 'Test task completed successfully!',
      consequence: 'This demonstrates that the Task-Oriented Design infrastructure is working correctly.',
      nextStep: {
        description: 'You can return to the home page or explore other test tasks.',
        href: '/',
        label: 'Go to Home'
      },
      downstream: [
        'Notification sent to test user',
        'Test event logged in system',
        'Dashboard metrics updated'
      ]
    });
  };

  return (
    <TaskScreen
      prompt={{
        title: 'Complete Test Task',
        subtitle: 'This is a demonstration of the TaskScreen component in action.'
      }}
      context={
        <div className="space-y-4">
          <div>
            <h3 className="font-semibold text-earth-brown mb-2">What you need to know:</h3>
            <p className="text-stone-gray">
              This is a test task to verify that the Task-Oriented Design infrastructure
              is working correctly. When you click the button below, it will:
            </p>
          </div>
          <ul className="list-disc list-inside text-stone-gray space-y-1 ml-2">
            <li>Show a loading state for 1 second</li>
            <li>Simulate a successful API call</li>
            <li>Display a confirmation screen with all result fields</li>
          </ul>
          <div className="bg-burnt-orange/10 border border-burnt-orange/30 rounded p-3 text-sm text-earth-brown">
            <strong>Note:</strong> This is a fake task for testing purposes only.
            No data will be saved to the database.
          </div>
        </div>
      }
      primaryAction={{
        label: 'Execute Test Task',
        onClick: () => {}  // Handled by TaskScreen
      }}
      secondaryActions={[
        {
          label: 'Cancel',
          onClick: () => window.history.back(),
          variant: 'secondary'
        }
      ]}
      onExecute={handleExecute}
    />
  );
}
