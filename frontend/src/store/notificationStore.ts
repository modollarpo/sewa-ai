// SEWA AI — frontend/src/store/notificationStore.ts
import { create } from 'zustand';

export interface Notification {
  id:        string;
  type:      'critical_finding' | 'urgent_finding' | 'scan_complete' | 'report_signed' | 'stroke_code' | 'info';
  title:     string;
  body:      string;
  scanId?:   string;
  urgency?:  string;
  read:      boolean;
  createdAt: string;
}

interface NotificationState {
  notifications:  Notification[];
  unreadCount:    number;
  criticalAlert:  Notification | null;
  addNotification: (n: Omit<Notification, 'id' | 'read' | 'createdAt'>) => void;
  markRead:       (id: string) => void;
  markAllRead:    () => void;
  dismissCritical: () => void;
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount:   0,
  criticalAlert: null,

  addNotification: (n) => {
    const notification: Notification = {
      ...n,
      id:        crypto.randomUUID(),
      read:      false,
      createdAt: new Date().toISOString(),
    };
    set(state => ({
      notifications: [notification, ...state.notifications].slice(0, 100),
      unreadCount:   state.unreadCount + 1,
      criticalAlert: n.type === 'critical_finding' || n.type === 'stroke_code'
        ? notification
        : state.criticalAlert,
    }));
  },

  markRead: (id) => set(state => ({
    notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n),
    unreadCount:   Math.max(0, state.unreadCount - 1),
  })),

  markAllRead: () => set(state => ({
    notifications: state.notifications.map(n => ({ ...n, read: true })),
    unreadCount:   0,
  })),

  dismissCritical: () => set({ criticalAlert: null }),
}));
