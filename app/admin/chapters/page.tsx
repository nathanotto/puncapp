import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';

export default async function AdminChaptersPage() {
  const supabase = await createClient();

  // Get all chapters with relevant data
  const { data: chapters } = await supabase
    .from('chapters')
    .select('*')
    .order('name');

  // Get member counts per chapter
  const { data: memberCounts } = await supabase
    .from('chapter_memberships')
    .select('chapter_id, user_id')
    .eq('is_active', true);

  const memberCountMap = new Map<string, number>();
  memberCounts?.forEach((m) => {
    memberCountMap.set(m.chapter_id, (memberCountMap.get(m.chapter_id) || 0) + 1);
  });

  // Get last meeting per chapter (most recent completed)
  const { data: lastMeetings } = await supabase
    .from('meetings')
    .select('chapter_id, scheduled_date')
    .eq('status', 'completed')
    .order('scheduled_date', { ascending: false });

  const lastMeetingMap = new Map<string, string>();
  lastMeetings?.forEach((m) => {
    if (!lastMeetingMap.has(m.chapter_id)) {
      lastMeetingMap.set(m.chapter_id, m.scheduled_date);
    }
  });

  // Get next meeting per chapter (earliest upcoming)
  const today = new Date().toISOString().split('T')[0];
  const { data: nextMeetings } = await supabase
    .from('meetings')
    .select('chapter_id, scheduled_date')
    .eq('status', 'scheduled')
    .gte('scheduled_date', today)
    .order('scheduled_date', { ascending: true });

  const nextMeetingMap = new Map<string, string>();
  nextMeetings?.forEach((m) => {
    if (!nextMeetingMap.has(m.chapter_id)) {
      nextMeetingMap.set(m.chapter_id, m.scheduled_date);
    }
  });

  // Split into flagged and regular
  const flaggedChapters = chapters?.filter((c) => c.needs_attention) || [];
  const regularChapters = chapters?.filter((c) => !c.needs_attention) || [];

  const statusColors = {
    open: 'bg-sage-green text-white',
    forming: 'bg-blue-100 text-blue-800',
    on_hold: 'bg-yellow-100 text-yellow-800',
    closed: 'bg-gray-100 text-gray-800',
  };

  const renderChapterRow = (chapter: any) => {
    const memberCount = memberCountMap.get(chapter.id) || 0;
    const lastMeeting = lastMeetingMap.get(chapter.id);
    const nextMeeting = nextMeetingMap.get(chapter.id);
    const statusColor = statusColors[chapter.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-800';

    return (
      <tr key={chapter.id} className="hover:bg-gray-50">
        <td className="px-6 py-4">
          <div>
            <Link href={`/admin/chapters/${chapter.id}`} className="text-burnt-orange hover:underline font-medium">
              {chapter.name}
            </Link>
            {chapter.attention_reason && (
              <div className="text-xs text-red-600 mt-1">{chapter.attention_reason}</div>
            )}
          </div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={`text-xs font-semibold px-2 py-1 rounded ${statusColor}`}>
            {chapter.status}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <span className={memberCount >= 10 ? 'text-orange-600 font-semibold' : 'text-earth-brown'}>
            {memberCount}
          </span>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-gray">
          {lastMeeting ? new Date(lastMeeting).toLocaleDateString() : '—'}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-stone-gray">
          {nextMeeting ? new Date(nextMeeting).toLocaleDateString() : '—'}
        </td>
        <td className="px-6 py-4 text-sm text-stone-gray">
          <div className="max-w-xs truncate">{chapter.default_location || '—'}</div>
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-right">
          <Link href={`/admin/chapters/${chapter.id}`} className="text-burnt-orange hover:underline text-sm">
            View →
          </Link>
        </td>
      </tr>
    );
  };

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-earth-brown">Chapters</h1>
          <Link
            href="/admin/work/create-chapter"
            className="bg-sage-green text-white px-4 py-2 rounded hover:bg-opacity-90 transition-colors"
          >
            + Create Chapter
          </Link>
        </div>

        {/* Flagged Chapters Section */}
        {flaggedChapters.length > 0 && (
          <div className="mb-8 bg-red-50 rounded-lg border-2 border-red-300 overflow-hidden">
            <div className="px-6 py-4 bg-red-100 border-b-2 border-red-300">
              <h2 className="text-lg font-bold text-red-900">
                🚩 Chapters Needing Attention ({flaggedChapters.length})
              </h2>
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b border-red-200 bg-red-50">
                  <th className="px-6 py-3 text-left text-xs font-medium text-red-900 uppercase tracking-wider">
                    Chapter Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-red-900 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-red-900 uppercase tracking-wider">
                    Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-red-900 uppercase tracking-wider">
                    Last Meeting
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-red-900 uppercase tracking-wider">
                    Next Meeting
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-red-900 uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-red-900 uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-red-200 bg-white">
                {flaggedChapters.map(renderChapterRow)}
              </tbody>
            </table>
          </div>
        )}

        {/* All Chapters Table */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-earth-brown">All Chapters</h2>
          </div>

          {!regularChapters || regularChapters.length === 0 ? (
            <div className="px-6 py-8 text-center text-stone-gray">
              No chapters found
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-gray uppercase tracking-wider">
                    Chapter Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-gray uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-gray uppercase tracking-wider">
                    Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-gray uppercase tracking-wider">
                    Last Meeting
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-gray uppercase tracking-wider">
                    Next Meeting
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-stone-gray uppercase tracking-wider">
                    Location
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-stone-gray uppercase tracking-wider">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {regularChapters.map(renderChapterRow)}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
