'use client';

import { useState, useEffect } from 'react';

interface Activity {
  id: string;
  created_at: string;
  actor_id: string | null;
  actor_type: string;
  action: string;
  entity_type: string;
  entity_id: string;
  chapter_id: string | null;
  summary: string;
  details: Record<string, any>;
  users: { id: string; name: string } | null;
  chapters: { id: string; name: string } | null;
}

interface ActivityFeedProps {
  chapters: Array<{ id: string; name: string }>;
}

export function ActivityFeed({ chapters }: ActivityFeedProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [chapterFilter, setChapterFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 50;

  const fetchActivities = async () => {
    setLoading(true);
    const params = new URLSearchParams({
      limit: limit.toString(),
      offset: offset.toString(),
    });

    if (chapterFilter) params.append('chapter_id', chapterFilter);
    if (actionFilter) params.append('action', actionFilter);

    const response = await fetch(`/api/admin/activity-feed?${params}`);
    const data = await response.json();

    if (data.activities) {
      setActivities(data.activities);
      setTotal(data.total || 0);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchActivities();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchActivities, 30000);
    return () => clearInterval(interval);
  }, [offset, chapterFilter, actionFilter]);

  const getActionColor = (action: string) => {
    if (action.includes('completed') || action.includes('approved') || action.includes('confirmed')) {
      return 'text-green-700 bg-green-50';
    }
    if (action.includes('rejected') || action.includes('cancelled') || action.includes('revoked')) {
      return 'text-red-700 bg-red-50';
    }
    if (action.includes('late') || action.includes('escalated') || action.includes('deficit')) {
      return 'text-orange-700 bg-orange-50';
    }
    return 'text-blue-700 bg-blue-50';
  };

  const formatTimeAgo = (timestamp: string) => {
    const now = new Date();
    const then = new Date(timestamp);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;

    return then.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-2xl font-semibold text-earth-brown mb-4">Activity Feed</h2>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Chapter</label>
            <select
              value={chapterFilter}
              onChange={(e) => {
                setChapterFilter(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-burnt-orange"
            >
              <option value="">All Chapters</option>
              {chapters.map((chapter) => (
                <option key={chapter.id} value={chapter.id}>
                  {chapter.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
            <select
              value={actionFilter}
              onChange={(e) => {
                setActionFilter(e.target.value);
                setOffset(0);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-burnt-orange"
            >
              <option value="">All Actions</option>
              <optgroup label="Meeting">
                <option value="meeting.closed">Meeting Closed</option>
                <option value="meeting.validated">Meeting Validated</option>
              </optgroup>
              <optgroup label="Funding">
                <option value="funding.donation_received">Donation Received</option>
                <option value="funding.monthly_debit_posted">Monthly Debit</option>
              </optgroup>
              <optgroup label="Admin">
                <option value="admin.leader_certified">Leader Certified</option>
                <option value="admin.leader_certification_revoked">Certification Revoked</option>
              </optgroup>
              <optgroup label="Member">
                <option value="member.became_contributing">Became Contributing</option>
              </optgroup>
            </select>
          </div>
        </div>
      </div>

      {/* Activity List */}
      <div className="divide-y divide-gray-200">
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : activities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No activities found</div>
        ) : (
          activities.map((activity) => (
            <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
              <div
                className="cursor-pointer"
                onClick={() => setExpandedId(expandedId === activity.id ? null : activity.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getActionColor(activity.action)}`}>
                        {activity.action}
                      </span>
                      {activity.chapters && (
                        <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                          {activity.chapters.name}
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {formatTimeAgo(activity.created_at)}
                      </span>
                    </div>
                    <p className="text-sm text-gray-900">{activity.summary}</p>
                    <p className="text-xs text-gray-500 mt-1">
                      by {activity.users?.name || activity.actor_type}
                    </p>
                  </div>
                  <button className="text-gray-400 hover:text-gray-600">
                    {expandedId === activity.id ? '▼' : '▶'}
                  </button>
                </div>

                {/* Expanded Details */}
                {expandedId === activity.id && (
                  <div className="mt-3 p-3 bg-gray-100 rounded text-xs">
                    <pre className="whitespace-pre-wrap font-mono text-gray-700">
                      {JSON.stringify(activity.details, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination */}
      {total > limit && (
        <div className="p-4 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-600">
            Showing {offset + 1} - {Math.min(offset + limit, total)} of {total}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="px-4 py-2 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
