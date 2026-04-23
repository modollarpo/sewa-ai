// SEWA AI — mobile/src/store/notificationStore.ts
// In-memory notification store with unread count
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import { create } from 'zustand';

export interface AppNotification {
  id: string;
  type: 'CRITICAL_ALERT' | 'URGENT_ALERT' | 'REPORT_READY' | 'MESSAGE' | 'SYSTEM';
  title: string;
  body: string;
  data?: Record<string, any>;
  read: boolean;
  createdAt: string;
}

interface NotificationStore {
  notifications: AppNotification[];
  unreadCount: number;
  addNotification: (n: Omit<AppNotification, 'id' | 'createdAt'> & { id?: string }) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: [],
  unreadCount: 0,
  addNotification: (n) => {
    const notif: AppNotification = {
      ...n,
      id: n.id || Date.now().toString(),
      createdAt: new Date().toISOString(),
    };
    set((s) => ({
      notifications: [notif, ...s.notifications].slice(0, 100),
      unreadCount: s.unreadCount + (notif.read ? 0 : 1),
    }));
  },
  markRead: (id) => set((s) => ({
    notifications: s.notifications.map((n) => n.id === id ? { ...n, read: true } : n),
    unreadCount: Math.max(0, s.unreadCount - 1),
  })),
  markAllRead: () => set((s) => ({
    notifications: s.notifications.map((n) => ({ ...n, read: true })),
    unreadCount: 0,
  })),
  clearAll: () => set({ notifications: [], unreadCount: 0 }),
}));
