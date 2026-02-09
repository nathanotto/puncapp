import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';

export default async function CurriculumResponsesPage({
  params,
  searchParams,
}: {
  params: Promise<{ chapterId: string }>;
  searchParams: { meeting?: string };
}) {
  const { chapterId } = await params;
  const supabase = await createClient();
  const selectedMeetingId = searchParams.meeting;

  // Check authentication
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  // Get chapter and verify user is a leader
  const { data: chapter } = await supabase
    .from('chapters')
    .select('id, name, leader_id')
    .eq('id', chapterId)
    .single();

  if (!chapter) {
    redirect('/');
  }

  // Check if user is leader or backup leader
  const { data: membership } = await supabase
    .from('chapter_memberships')
    .select('role')
    .eq('chapter_id', chapterId)
    .eq('user_id', user.id)
    .single();

  const isLeader = membership?.role === 'leader' || membership?.role === 'backup_leader';

  if (!isLeader) {
    redirect(`/chapters/${chapterId}`);
  }

  // Build query for responses
  let query = supabase
    .from('curriculum_responses')
    .select(`
      id,
      response,
      submitted_at,
      user:users(id, name),
      module:curriculum_modules(id, title),
      meeting:meetings(id, scheduled_start, scheduled_date)
    `)
    .eq('meeting.chapter_id', chapterId)
    .order('submitted_at', { ascending: false });

  // Filter by meeting if specified
  if (selectedMeetingId) {
    query = query.eq('meeting_id', selectedMeetingId);
  }

  const { data: responses } = await query;

  // Get all meetings with curriculum for this chapter (for filter dropdown)
  const { data: meetingsWithCurriculum } = await supabase
    .from('meetings')
    .select(`
      id,
      scheduled_start,
      scheduled_date,
      module:curriculum_modules!meetings_selected_curriculum_id_fkey(title)
    `)
    .eq('chapter_id', chapterId)
    .not('selected_curriculum_id', 'is', null)
    .order('scheduled_start', { ascending: false })
    .limit(50);

  // Group responses by meeting
  const groupedByMeeting = responses?.reduce((acc: any, resp: any) => {
    const meetingId = resp.meeting?.id;
    if (!meetingId) return acc;

    if (!acc[meetingId]) {
      acc[meetingId] = {
        meeting: resp.meeting,
        module: resp.module,
        responses: [],
      };
    }
    acc[meetingId].responses.push(resp);
    return acc;
  }, {}) || {};

  const groupedData = Object.values(groupedByMeeting);

  return (
    <div className="p-8">
      <div className="mb-6">
        <Link href={`/chapters/${chapterId}`} className="text-blue-600 hover:underline">
          ← Back to Chapter
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Curriculum Responses</h1>
        <p className="text-gray-600">{chapter.name}</p>
      </div>

      {/* Filter */}
      <div className="mb-6 bg-white border border-gray-200 rounded-lg p-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Filter by Meeting
        </label>
        <select
          value={selectedMeetingId || ''}
          onChange={(e) => {
            const url = new URL(window.location.href);
            if (e.target.value) {
              url.searchParams.set('meeting', e.target.value);
            } else {
              url.searchParams.delete('meeting');
            }
            window.location.href = url.toString();
          }}
          className="w-full md:w-96 px-3 py-2 border border-gray-300 rounded-lg"
        >
          <option value="">All Meetings</option>
          {meetingsWithCurriculum?.map((meeting: any) => (
            <option key={meeting.id} value={meeting.id}>
              {new Date(meeting.scheduled_start).toLocaleDateString()} - {meeting.module?.title || 'Unknown Module'}
            </option>
          ))}
        </select>
      </div>

      {/* Responses Grouped by Meeting */}
      {!responses || responses.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
          <p className="text-gray-600">
            {selectedMeetingId
              ? 'No responses for this meeting.'
              : 'No curriculum responses yet.'}
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {groupedData.map((group: any) => (
            <div key={group.meeting?.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              {/* Meeting Header */}
              <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {new Date(group.meeting?.scheduled_start).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h2>
                    <p className="text-sm text-gray-600 mt-1">
                      Module: {group.module?.title}
                    </p>
                  </div>
                  <Link
                    href={`/meetings/${group.meeting?.id}/summary`}
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View Meeting
                  </Link>
                </div>
              </div>

              {/* Responses Table */}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Member
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Response
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Submitted
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {group.responses.map((resp: any) => (
                      <tr key={resp.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {resp.user?.name || 'Unknown'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-700 max-w-2xl">
                            {resp.response.length > 200 ? (
                              <details>
                                <summary className="cursor-pointer text-blue-600 hover:underline">
                                  {resp.response.substring(0, 200)}... (click to expand)
                                </summary>
                                <div className="mt-2 whitespace-pre-wrap">{resp.response}</div>
                              </details>
                            ) : (
                              <span className="whitespace-pre-wrap">{resp.response}</span>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-500">
                            {new Date(resp.submitted_at).toLocaleDateString()}
                          </div>
                          <div className="text-xs text-gray-400">
                            {new Date(resp.submitted_at).toLocaleTimeString()}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Response Count */}
              <div className="bg-gray-50 border-t border-gray-200 px-6 py-3">
                <p className="text-sm text-gray-600">
                  {group.responses.length} {group.responses.length === 1 ? 'response' : 'responses'}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
