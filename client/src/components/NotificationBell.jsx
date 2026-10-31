import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Bell, CheckCheck, ExternalLink } from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../api/notifications';

export const NotificationBell = () => {
  const { unreadNotifications, refreshUnreadTotal } = useSocket() || {};
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const loadLatest = async () => {
    try {
      setLoading(true);
      const res = await getNotifications({ limit: 5 });
      setNotifications(res.data || []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  const toggleDropdown = () => {
    if (!open) {
      loadLatest();
    }
    setOpen(!open);
  };

  const handleMarkRead = async (id, e) => {
    e.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n))
      );
      if (refreshUnreadTotal) refreshUnreadTotal();
    } catch {
      // ignore
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      if (refreshUnreadTotal) refreshUnreadTotal();
    } catch {
      // ignore
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={toggleDropdown}
        className="relative p-2 text-gray-700 hover:text-blue-600 rounded-lg hover:bg-gray-100 transition"
        title="Notifications"
      >
        <Bell className="w-5 h-5" />
        {unreadNotifications > 0 && (
          <span className="absolute top-1 right-1 w-4 h-4 rounded-full bg-red-500 text-white font-bold text-[10px] flex items-center justify-center">
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="px-4 py-3 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-gray-900 text-sm">Notifications</span>
            {notifications.some((n) => !n.read) && (
              <button
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
            {loading ? (
              <div className="p-4 text-center text-sm text-gray-500">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-6 text-center text-sm text-gray-500">No notifications yet</div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  className={`p-3.5 hover:bg-gray-50 transition text-sm flex gap-3 ${
                    notif.read ? 'opacity-70' : 'bg-blue-50/40'
                  }`}
                >
                  <div className="flex-1">
                    <p className="text-gray-800 text-xs sm:text-sm font-medium">{notif.message}</p>
                    <span className="text-[11px] text-gray-400 mt-1 block">
                      {new Date(notif.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 justify-center">
                    {notif.link && (
                      <Link
                        to={notif.link}
                        onClick={() => setOpen(false)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="View details"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    )}
                    {!notif.read && (
                      <button
                        onClick={(e) => handleMarkRead(notif._id, e)}
                        className="w-2 h-2 rounded-full bg-blue-600"
                        title="Mark as read"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="p-2.5 bg-gray-50 border-t border-gray-100 text-center">
            <Link
              to="/notifications"
              onClick={() => setOpen(false)}
              className="text-xs font-medium text-blue-600 hover:underline"
            >
              View all notifications
            </Link>
          </div>
        </div>
      )}
    </div>
  );
};
