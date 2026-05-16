'use client';

import { useEffect, useRef } from 'react';
import { io, type Socket } from 'socket.io-client';
import { loadAccessToken } from '@/lib/api';

type AdminEvent =
  | 'user-event'
  | 'order-created'
  | 'order-status-changed'
  | 'support-new-ticket'
  | 'connected';

export function useAdminSocket(handlers: Partial<Record<AdminEvent, (payload: unknown) => void>>) {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    const token = loadAccessToken();
    if (!token) return;
    const base = typeof window !== 'undefined' ? window.location.origin : '';
    const socket = io(`${base}/admin`, {
      path: '/socket.io',
      auth: { token },
      transports: ['websocket', 'polling'],
      withCredentials: true,
      reconnection: true,
    });
    socketRef.current = socket;

    for (const [event, handler] of Object.entries(handlers) as Array<[AdminEvent, (p: unknown) => void]>) {
      socket.on(event, handler);
    }

    return () => {
      for (const event of Object.keys(handlers)) {
        socket.off(event);
      }
      socket.disconnect();
      socketRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return socketRef;
}
