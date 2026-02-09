import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { redirect } from 'next/navigation';

export default async function ValidationQueuePage() {
  const supabase = await createClient();

  // Check admin access
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('users')
    .select('is_punc_admin')
    .eq('id', user.id)
    .single();

  if (!profile?.is_punc_admin) {
    redirect('/');
  }

  // Get meetings awaiting admin approval
  const { data: awaitingMeetings } = await supabase
    .from('meetings')
    .select(`
      id,
      scheduled_start,
      leader_validated_at,
      leader_validation_notes,
      chapter:chapters(id, name),
      leader:users!meetings_leader_id_fkey(id, name)
    `)
    .eq('validation_status', 'awaiting_admin')
    .order('leader_validated_at', { ascending: true });

  // Get recently processed meetings
  const { data: processedMeetings } = await supabase
    .from('meetings')
    .select(`
      id,
      scheduled_start,
      validation_status,
      admin_validated_at,
      chapter:chapters(id, name),
      admin_validator:users!meetings_admin_validated_by_fkey(id, name)
    `)
    .in('validation_status', ['approved', 'rejected'])
    .order('admin_validated_at', { ascending: false })
    .limit(20);

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Meeting Validation</h1>
      </div>

      {/* Awaiting Admin Section */}
      <div className="mb-12">
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-amber-50 border-b border-amber-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-amber-900">
              Awaiting Admin Review
              <span className="ml-2 px-2 py-1 bg-amber-200 text-amber-900 text-sm rounded">
                {awaitingMeetings?.length || 0}
              </span>
            </h2>
          </div>

          {!awaitingMeetings || awaitingMeetings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No meetings awaiting admin review.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chapter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Meeting Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leader Validated
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Leader Notes
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {awaitingMeetings.map((meeting: any) => (
                    <tr key={meeting.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {meeting.chapter?.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(meeting.scheduled_start).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(meeting.leader_validated_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(meeting.leader_validated_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 max-w-xs">
                          {meeting.leader_validation_notes ? (
                            meeting.leader_validation_notes.length > 80 ? (
                              <span title={meeting.leader_validation_notes}>
                                {meeting.leader_validation_notes.substring(0, 80)}...
                              </span>
                            ) : (
                              meeting.leader_validation_notes
                            )
                          ) : (
                            <span className="text-gray-400 italic">No notes</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/admin/validation/${meeting.id}`}
                          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm font-medium"
                        >
                          Review
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recently Processed Section */}
      <div>
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-semibold text-gray-900">Recently Processed</h2>
            <p className="text-sm text-gray-600 mt-1">Last 20 meetings reviewed</p>
          </div>

          {!processedMeetings || processedMeetings.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              No processed meetings yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Chapter
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Meeting Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reviewed By
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Reviewed At
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {processedMeetings.map((meeting: any) => (
                    <tr key={meeting.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {meeting.chapter?.name}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(meeting.scheduled_start).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {meeting.validation_status === 'approved' ? (
                          <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-700 rounded">
                            Approved
                          </span>
                        ) : (
                          <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-700 rounded">
                            Rejected
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {meeting.admin_validator?.name || 'Unknown'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {new Date(meeting.admin_validated_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(meeting.admin_validated_at).toLocaleTimeString('en-US', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
