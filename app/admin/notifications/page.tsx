import { createClient } from '@/lib/supabase/server';
import { normalizeJoin } from '@/lib/supabase/utils';
import { redirect } from 'next/navigation';
import TriggerEscalationButton from '@/components/admin/TriggerEscalationButton';

interface NotificationsPageProps {
  searchParams: Promise<{ status?: string; type?: string; purpose?: string }>;
}

export default async function NotificationsPage({ searchParams }: NotificationsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  // Get current user
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/auth/login');
  }

  // Get user's name
  const { data: userData } = await supabase
    .from('users')
    .select('name, username')
    .eq('id', user.id)
    .single();

  // Build query with filters
  let query = supabase
    .from('notification_log')
    .select(`
      id,
      notification_type,
      purpose,
      status,
      subject,
      content,
      created_at,
      sent_at,
      users!notification_log_recipient_user_id_fkey (
        name,
        email
      )
    `)
    .order('created_at', { ascending: false });

  if (params.status) {
    query = query.eq('status', params.status);
  }
  if (params.type) {
    query = query.eq('notification_type', params.type);
  }
  if (params.purpose) {
    query = query.eq('purpose', params.purpose);
  }

  const { data: notifications, error } = await query.limit(100);

  if (error) {
    console.error('Error fetching notifications:', error);
  }

  // Get unique values for filters
  const { data: allNotifications } = await supabase
    .from('notification_log')
    .select('notification_type, purpose, status');

  const uniqueTypes = [...new Set(allNotifications?.map(n => n.notification_type) || [])];
  const uniquePurposes = [...new Set(allNotifications?.map(n => n.purpose) || [])];
  const uniqueStatuses = [...new Set(allNotifications?.map(n => n.status) || [])];

  return (
    <div className="min-h-screen bg-warm-cream">
      {/* Header */}
      <header className="bg-deep-charcoal text-warm-cream py-6 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex justify-between items-start mb-4">
            <a href="/" className="text-sm text-warm-cream/80 hover:text-warm-cream">
              ← Back to Dashboard
            </a>
            <div className="text-right text-sm">
              <p className="text-warm-cream/80">{userData?.username || userData?.name || 'Member'}</p>
              <a href="/auth/logout" className="text-warm-cream/60 hover:text-warm-cream">
                Sign Out
              </a>
            </div>
          </div>
          <h1 className="text-3xl font-bold mb-2">Notification Log</h1>
          <p className="text-warm-cream/80">All notifications sent by the system</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-8 px-6">
        {/* Trigger Escalation Button */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold text-earth-brown mb-1">Manual Escalation Trigger</h2>
              <p className="text-sm text-stone-gray">
                Run the escalation logic manually for testing. This checks for meetings 2-3 days away and creates tasks/notifications.
              </p>
            </div>
            <TriggerEscalationButton />
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-earth-brown mb-4">Filters</h2>
          <form method="get" className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-gray mb-1">Status</label>
              <select
                name="status"
                defaultValue={params.status || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
              >
                <option value="">All</option>
                {uniqueStatuses.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-gray mb-1">Type</label>
              <select
                name="type"
                defaultValue={params.type || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
              >
                <option value="">All</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-stone-gray mb-1">Purpose</label>
              <select
                name="purpose"
                defaultValue={params.purpose || ''}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-burnt-orange focus:border-burnt-orange"
              >
                <option value="">All</option>
                {uniquePurposes.map(purpose => (
                  <option key={purpose} value={purpose}>{purpose.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                className="w-full bg-burnt-orange text-white py-2 px-4 rounded-lg font-medium hover:bg-burnt-orange/90 transition-colors"
              >
                Apply Filters
              </button>
            </div>
          </form>
        </div>

        {/* Notifications List */}
        <div className="space-y-4">
          {notifications && notifications.length > 0 ? (
            notifications.map((notification) => {
              const user = normalizeJoin(notification.users);

              return (
              <div key={notification.id} className="bg-white rounded-lg p-6 border border-gray-200">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-earth-brown">
                        {user?.name || 'Unknown User'}
                      </h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        notification.notification_type === 'email'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {notification.notification_type.toUpperCase()}
                      </span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        notification.status === 'simulated'
                          ? 'bg-orange-100 text-orange-800 border-2 border-orange-300'
                          : notification.status === 'sent'
                          ? 'bg-green-100 text-green-800'
                          : notification.status === 'failed'
                          ? 'bg-red-100 text-red-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {notification.status === 'simulated' ? '⚠️ SIMULATED' : notification.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-stone-gray">
                      {user?.email}
                    </p>
                  </div>
                  <div className="text-right text-sm text-stone-gray">
                    {new Date(notification.created_at).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>

                <div className="space-y-2">
                  <div>
                    <span className="text-sm font-medium text-stone-gray">Purpose: </span>
                    <span className="text-sm text-earth-brown">{notification.purpose.replace(/_/g, ' ')}</span>
                  </div>

                  {notification.subject && (
                    <div>
                      <span className="text-sm font-medium text-stone-gray">Subject: </span>
                      <span className="text-sm text-earth-brown">{notification.subject}</span>
                    </div>
                  )}

                  <div>
                    <span className="text-sm font-medium text-stone-gray">Content:</span>
                    <p className="text-sm text-stone-gray mt-1 p-3 bg-gray-50 rounded border border-gray-200">
                      {notification.content}
                    </p>
                  </div>
                </div>

                {notification.status === 'simulated' && (
                  <div className="mt-4 p-3 bg-orange-50 border border-orange-200 rounded">
                    <p className="text-sm text-orange-800">
                      <strong>⚠️ This notification was NOT actually sent.</strong> It was simulated for testing.
                      When email/SMS integration is enabled, this will be sent via Resend/Twilio.
                    </p>
                  </div>
                )}
              </div>
              );
            })
          ) : (
            <div className="bg-white rounded-lg p-12 text-center">
              <p className="text-stone-gray text-lg">No notifications found</p>
              <p className="text-sm text-stone-gray mt-2">
                Notifications will appear here when escalation logic runs
              </p>
            </div>
          )}
        </div>

        {notifications && notifications.length === 100 && (
          <div className="mt-4 text-center text-sm text-stone-gray">
            Showing latest 100 notifications
          </div>
        )}
      </main>
    </div>
  );
}
