// SEWA AI — mobile/src/services/offlineSyncService.ts
// Replay queued mutations when connectivity is restored
// © 2026 SEWA AI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import { apiClient } from './apiClient';
import { useOfflineStore, PendingOp } from '../store/offlineStore';

export async function syncQueue(queue: PendingOp[]): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  for (const op of queue) {
    try {
      await apiClient.request({ method: op.method, url: op.url, data: op.data });
      useOfflineStore.getState().removeOp(op.id);
      synced++;
    } catch (err) {
      useOfflineStore.getState().incrementRetry(op.id);
      // Remove if retried too many times
      if ((op.retries || 0) >= 3) {
        useOfflineStore.getState().removeOp(op.id);
      }
      failed++;
    }
  }

  return { synced, failed };
}

export function useOfflineSync() {
  const { pendingQueue, isOnline, setOnline } = useOfflineStore();

  const handleConnectivityChange = async (online: boolean) => {
    setOnline(online);
    if (online && pendingQueue.length > 0) {
      await syncQueue(pendingQueue);
    }
  };

  return { pendingQueue, isOnline, handleConnectivityChange };
}
