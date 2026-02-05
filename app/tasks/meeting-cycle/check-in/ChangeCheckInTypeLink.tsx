'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { checkInToMeeting } from './actions';

interface ChangeCheckInTypeLinkProps {
  meetingId: string;
  currentType: 'in_person' | 'video';
}

export default function ChangeCheckInTypeLink({ meetingId, currentType }: ChangeCheckInTypeLinkProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const newType = currentType === 'in_person' ? 'video' : 'in_person';
  const newTypeLabel = newType === 'in_person' ? 'In Person' : 'Video';

  const handleChange = async () => {
    if (!confirm(`Change check-in to ${newTypeLabel}?`)) {
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('meetingId', meetingId);
      formData.append('attendanceType', newType);

      const result = await checkInToMeeting(formData);

      if (result.success) {
        router.refresh();
      } else {
        alert(result.message);
        setLoading(false);
      }
    } catch (error: any) {
      alert(`Error: ${error.message}`);
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleChange}
      disabled={loading}
      className="text-sm text-green-700 hover:text-green-900 underline disabled:opacity-50"
    >
      {loading ? 'Changing...' : `Change check-in to ${newTypeLabel}`}
    </button>
  );
}
