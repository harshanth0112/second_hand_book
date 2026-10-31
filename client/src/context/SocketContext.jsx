import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { getInbox } from '../api/chat';

const SocketContext = createContext(null);

export function SocketProvider({ children }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState(null);
  const [unreadTotal, setUnreadTotal] = useState(0);

  const refreshUnreadTotal = async () => {
    if (!user) {
      setUnreadTotal(0);
      return;
    }
    try {
      const inbox = await getInbox();
      const sum = (inbox || []).reduce((acc, c) => acc + (c.unreadCount || 0), 0);
      setUnreadTotal(sum);
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

    setSocket(s);
    refreshUnreadTotal();

    return () => {
      s.disconnect();
    };
  }, [user]);

  return (
    <SocketContext.Provider value={{ socket, unreadTotal, refreshUnreadTotal }}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  return useContext(SocketContext);
}

