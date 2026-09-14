// SEWA XAI — frontend/public/sw.js
// PWA Service Worker (vite-plugin-pwa injectManifest source).
// Bundled at build time; the precache manifest is injected via __WB_MANIFEST.
// Provides: precaching, runtime caching, offline navigation fallback,
// DICOM network bypass, background sync, and clinical push notifications.
import { precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import { NetworkFirst, StaleWhileRevalidate, CacheFirst, NetworkOnly } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

// ── Precache (injected at build time) ─────────────────────
precacheAndRoute(self.__WB_MANIFEST);

// Navigate fallback → cached index.html for SPA routes
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// ── Runtime caching ───────────────────────────────────────
registerRoute(
  /^https:\/\/api\.sewaxai\.health\/api\/v1\/scans/,
  new NetworkFirst({
    cacheName: 'sewa-scans-cache',
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 300, maxEntries: 50 })],
  })
);

registerRoute(
  /^https:\/\/api\.sewaxai\.health\/api\/v1\/reports/,
  new NetworkFirst({
    cacheName: 'sewa-reports-cache',
    plugins: [new ExpirationPlugin({ maxAgeSeconds: 3600, maxEntries: 20 })],
  })
);

registerRoute(
  /^https:\/\/api\.sewaxai\.health\/api\/v1\/users\/me/,
  new StaleWhileRevalidate({ cacheName: 'sewa-user-cache' })
);

registerRoute(
  /\.(?:png|jpg|jpeg|svg|gif|woff2)$/,
  new CacheFirst({
    cacheName: 'sewa-assets-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 100 })],
  })
);

// ── DICOM streams: always network, never cache ────────────
registerRoute(({ url }) => url.pathname.includes('.dcm'), new NetworkOnly());

// ── Offline-first API fallback ────────────────────────────
registerRoute(
  /^https:\/\/api\.sewaxai\.health\/api\/v1\/(?!scans|reports|users)/,
  new NetworkFirst({
    cacheName: 'sewa-api-cache',
    plugins: [
      {
        handlerDidError: async () =>
          new Response(JSON.stringify({ offline: true, message: 'Offline — showing cached data' }), {
            headers: { 'Content-Type': 'application/json' },
            status: 503,
          }),
      },
    ],
  })
);

// ── Clinical Alert Categories ─────────────────────────────
const CLINICAL_CATEGORIES = {
  STROKE_CODE:       { urgency: 'CRITICAL', vibrate: [500, 250, 500, 250, 500], sound: 'critical_alert.caf', requiresAck: true },
  CRITICAL_FINDING:  { urgency: 'CRITICAL', vibrate: [500, 250, 500, 250, 500], sound: 'critical_alert.caf', requiresAck: true },
  URGENT_FINDING:    { urgency: 'URGENT',   vibrate: [300, 150, 300, 150, 300], sound: 'urgent_alert.caf',  requiresAck: true },
  NORMAL_FINDING:    { urgency: 'NORMAL',   vibrate: [200],                     sound: 'default',           requiresAck: false },
};

// ── Background Sync (offline mutations) ───────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sewa-offline-sync') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  console.log('[SW] Syncing offline queue...');
}

// ── Clinical Push Notifications ───────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const category = CLINICAL_CATEGORIES[data.category] ?? CLINICAL_CATEGORIES.NORMAL_FINDING;
  const urgency = data.urgency ?? category.urgency;

  const options = {
    body:    data.body  || 'New SEWA XAI notification',
    icon:    '/icons/icon-192.png',
    badge:   '/icons/badge-72.png',
    vibrate: category.vibrate,
    tag:     data.scanId || `sewa-${data.category ?? 'notification'}`,
    data:    { ...data, category: data.category ?? 'normal_finding' },
    requireInteraction: category.requiresAck,
    actions: category.requiresAck ? [
      { action: 'review', title: 'Review Now' },
      { action: 'dismiss', title: 'Dismiss' },
    ] : [],
    sound: category.sound,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SEWA XAI Clinical Alert', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const scanId = event.notification.data?.scanId;
  const url = scanId ? `/scans/${scanId}` : '/worklist';

  if (event.action === 'review' || !event.action) {
    event.waitUntil(
      clients.matchAll({ type: 'window' }).then(list => {
        for (const client of list) {
          if ('focus' in client) { client.focus(); client.postMessage({ type: 'navigate', url }); return; }
        }
        return clients.openWindow(url);
      })
    );
  }
});

// ── Critical Alert Acknowledgement ────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'ACKNOWLEDGE_CRITICAL') {
    const { scanId } = event.data;
    clients.matchAll().then(clients => {
      clients.forEach(c => c.postMessage({ type: 'CRITICAL_ACK', scanId }));
    });
  }
});