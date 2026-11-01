import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getInbox } from '../api/chat';
import { getNotifications } from '../api/notifications';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const refreshUnreadTotal = async () => {
    if (!user) {
      setUnreadTotal(0);
      setUnreadNotifications(0);
      return;
    }
    try {
      const [inbox, notifData] = await Promise.all([
        getInbox().catch(() => []),
        getNotifications({ limit: 1 }).catch(() => ({ unreadCount: 0 })),
      ]);
      const sum = (inbox || []).reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      setUnreadTotal(sum);
      setUnreadNotifications(notifData.unreadCount || 0);
    } catch {
      // ignore in background
    }
  };

  useEffect(() => {
    if (!user) {
      setSocket((prev) => {
        if (prev) {
          prev.disconnect();
        }
        return null;
      });
      setUnreadTotal(0);
      setUnreadNotifications(0);
      return;
    }

    // Connect socket using credentials/cookie
    const socketUrl = import.meta.env.VITE_API_URL || undefined;
    if (!socketUrl && import.meta.env.PROD) {
      console.warn(
        '[SocketContext] VITE_API_URL is not set in production. ' +
        'Socket.IO will default to current window origin, which may fail if frontend and backend are hosted separately.'
      );
    }

    const s = io(socketUrl, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      refreshUnreadTotal();
    });

    s.on('message:new', () => {
      refreshUnreadTotal();
    });

    s.on('message:read', () => {
      refreshUnreadTotal();
    });

    s.on('notification:new', () => {
      refreshUnreadTotal();
    });

    setSocket(s);
    refreshUnreadTotal();

    return () => {
      s.disconnect();
      setSocket((prev) => (prev === s ? null : prev));
    };
  }, [user]);

  return (
    <SocketContext.Provider
      value={{
        socket,
        unreadTotal,
        unreadNotifications,
        refreshUnreadTotal,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

