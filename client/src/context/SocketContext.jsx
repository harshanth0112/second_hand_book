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
      if (socket) {
        socket.disconnect();
        setSocket(null);
      }
      setUnreadTotal(0);
      setUnreadNotifications(0);
      return;
    }

    // Connect socket using credentials/cookie
    const s = io({
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

