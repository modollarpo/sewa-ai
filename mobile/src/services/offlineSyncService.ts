// SEWA XAI — mobile/src/services/offlineSyncService.ts
// Replay queued mutations when connectivity is restored
// © 2026 SEWA XAI — a Storegrill Inc Ltd company. Registered in England & Wales (14581073).
import { apiClient } from './apiClient';
import { useOfflineStore, PendingOp } from '../store/offlineStore';
import { getUnsyncedScans, markScanAsSynced } from './localDatabase';

export async function syncQueue(queue: PendingOp[]): Promise<{ synced: number; failed: number }> {
  let synced = 0;
  let failed = 0;

  // 1. Sync standard mutation queue
  for (const op of queue) {
    try {
      await apiClient.request({ method: op.method, url: op.url, data: op.data });
      useOfflineStore.getState().removeOp(op.id);
      synced++;
    } catch (err) {
      useOfflineStore.getState().incrementRetry(op.id);
      if ((op.retries || 0) >= 3) {
        useOfflineStore.getState().removeOp(op.id);
      }
      failed++;
    }
  }

  // 2. Sync SQLite offline scans (Background Sync Service)
  const unsyncedScans = await getUnsyncedScans();
  if (unsyncedScans.length > 0) {
    try {
      // Push all offline scans to the edge-sync endpoint in one request
      await apiClient.post('/scans/sync-batch', { scans: unsyncedScans });
      for (const scan of unsyncedScans) {
        await markScanAsSynced(scan.id);
        synced++;
      }
    } catch (err) {
      failed += unsyncedScans.length;
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
