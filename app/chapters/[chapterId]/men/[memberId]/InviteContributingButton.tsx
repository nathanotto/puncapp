'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface InviteContributingButtonProps {
  chapterId: string;
  memberId: string;
  memberName: string;
}

export function InviteContributingButton({
  chapterId,
  memberId,
  memberName,
}: InviteContributingButtonProps) {
  const router = useRouter();
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleInvite = async () => {
    if (!confirm(`Invite ${memberName} to become a contributing member?`)) {
      return;
    }

    setInviting(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/chapters/${chapterId}/members/${memberId}/invite-contributing`,
        {
          method: 'POST',
        }
      );

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to send invitation');
      }

      alert(`Invitation sent to ${memberName}!`);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleInvite}
        disabled={inviting}
        className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {inviting ? 'Sending...' : 'Invite as Contributing Member'}
      </button>
      {error && (
        <p className="text-red-600 text-sm mt-2">{error}</p>
      )}
    </div>
  );
}
