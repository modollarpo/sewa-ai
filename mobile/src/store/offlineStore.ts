// SEWA AI — mobile/src/store/offlineStore.ts
// Offline-first mutation queue — persisted to AsyncStorage
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface PendingOp {
  id: string;
  method: string;
  url: string;
  data: any;
  createdAt: string;
  retries?: number;
}

interface OfflineStore {
  pendingQueue: PendingOp[];
  isOnline: boolean;
  setOnline: (online: boolean) => void;
  enqueue: (op: Omit<PendingOp, 'id' | 'createdAt'>) => void;
  clearQueue: () => void;
  removeOp: (id: string) => void;
  incrementRetry: (id: string) => void;
}

export const useOfflineStore = create<OfflineStore>()(
  persist(
    (set) => ({
      pendingQueue: [],
      isOnline: true,
      setOnline: (online) => set({ isOnline: online }),
      enqueue: (op) => set((s) => ({
        pendingQueue: [
          ...s.pendingQueue,
          { ...op, id: Date.now().toString(), createdAt: new Date().toISOString(), retries: 0 },
        ],
      })),
      clearQueue: () => set({ pendingQueue: [] }),
      removeOp: (id) => set((s) => ({
        pendingQueue: s.pendingQueue.filter((o) => o.id !== id),
      })),
      incrementRetry: (id) => set((s) => ({
        pendingQueue: s.pendingQueue.map((o) =>
          o.id === id ? { ...o, retries: (o.retries || 0) + 1 } : o
        ),
      })),
    }),
    { name: 'sewa-offline-queue', storage: createJSONStorage(() => AsyncStorage) }
  )
);
