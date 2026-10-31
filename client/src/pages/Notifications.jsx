import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';
import { Bell, CheckCheck, ExternalLink, Filter } from 'lucide-react';
import { useSocket } from '../context/SocketContext';

export function Notifications() {
  const { refreshUnreadTotal } = useSocket() || {};
  const [notifications, setNotifications] = useState([]);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const fetchNotifs = async (p = 1, unread = unreadOnly) => {
    try {
      setLoading(true);
      const res = await getNotifications({
        page: p,
        limit: 20,
        unread: unread ? true : undefined,
      });
      setNotifications(res.data || []);
      setPagination(res.pagination || null);
      setPage(p);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs(1, unreadOnly);
  }, [unreadOnly]);

  const handleMarkRead = async (id) => {
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      if (refreshUnreadTotal) refreshUnreadTotal();
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAll = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      if (refreshUnreadTotal) refreshUnreadTotal();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Bell className="w-6 h-6 text-blue-600" />
            Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Updates on your textbook requests, price drops, and wanted alerts.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setUnreadOnly(!unreadOnly)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border flex items-center gap-1.5 transition ${
              unreadOnly
                ? 'bg-blue-50 border-blue-200 text-blue-700'
                : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-3.5 h-3.5" />
            {unreadOnly ? 'Showing Unread' : 'Filter Unread'}
          </button>

          {notifications.some((n) => !n.read) && (
            <button
              onClick={handleMarkAll}
              className="px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 flex items-center gap-1 transition"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-gray-500">Loading notifications...</div>
      ) : notifications.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl border border-gray-200 p-8 shadow-xs">
          <Bell className="w-12 h-12 text-gray-300 mx-auto mb-2" />
          <h3 className="text-base font-semibold text-gray-800">No notifications</h3>
          <p className="text-sm text-gray-500 mt-1">
            {unreadOnly ? 'You have no unread notifications.' : 'You have no notifications yet.'}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100 overflow-hidden shadow-2xs">
          {notifications.map((notif) => (
            <div
              key={notif._id}
              className={`p-4 flex items-start justify-between gap-4 transition ${
                notif.read ? 'bg-white hover:bg-gray-50/60' : 'bg-blue-50/40 hover:bg-blue-50/70'
              }`}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded tracking-wider ${
                      notif.type === 'wanted_match'
                        ? 'bg-purple-100 text-purple-700'
                        : notif.type === 'price_drop'
                        ? 'bg-amber-100 text-amber-800'
                        : notif.type === 'request_accepted'
                        ? 'bg-emerald-100 text-emerald-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {notif.type.replace('_', ' ')}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(notif.createdAt).toLocaleDateString([], {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>

                <p className="text-sm text-gray-900 font-medium">{notif.message}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0 pt-1">
                {notif.link && (
                  <Link
                    to={notif.link}
                    className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
                    title="View"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </Link>
                )}
                {!notif.read && (
                  <button
                    onClick={() => handleMarkRead(notif._id)}
                    className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition"
                    title="Mark as read"
                  >
                    <CheckCheck className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {pagination && pagination.pages > 1 && (
        <div className="mt-6 flex justify-center gap-2">
          <button
            disabled={page <= 1}
            onClick={() => fetchNotifs(page - 1)}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-40"
          >
            Previous
          </button>
          <span className="px-3 py-1.5 text-sm text-gray-600">
            Page {page} of {pagination.pages}
          </span>
          <button
            disabled={page >= pagination.pages}
            onClick={() => fetchNotifs(page + 1)}
            className="px-3 py-1.5 text-sm bg-white border border-gray-300 rounded-lg disabled:opacity-40"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

