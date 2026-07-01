// SEWA XAI — frontend/public/sw.js
// PWA Service Worker: offline cache, background sync, push notifications
// Feature: PWA Capabilities

const CACHE_NAME   = 'sewa-ai-v2.4.1';
const STATIC_CACHE = 'sewa-static-v2.4.1';
const API_CACHE    = 'sewa-api-v2.4.1';

// Assets to precache on install
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// API routes to cache with network-first strategy
const NETWORK_FIRST_PATTERNS = [
  /\/api\/v1\/scans/,
  /\/api\/v1\/reports/,
  /\/api\/v1\/notifications/,
];

// Cache-first patterns (static assets)
const CACHE_FIRST_PATTERNS = [
  /\.js$/, /\.css$/, /\.png$/, /\.jpg$/, /\.svg$/, /\.woff/,
];

// ── Install ────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ── Activate ───────────────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => ![CACHE_NAME, STATIC_CACHE, API_CACHE].includes(k))
            .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET and cross-origin
  if (event.request.method !== 'GET' || url.origin !== self.location.origin) return;

  // DICOM files — network only (too large to cache)
  if (url.pathname.includes('/scans/') && url.pathname.includes('.dcm')) return;

  // Network first for API calls
  if (NETWORK_FIRST_PATTERNS.some(p => p.test(url.pathname))) {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Cache first for static assets
  if (CACHE_FIRST_PATTERNS.some(p => p.test(url.pathname))) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // SPA navigation — serve index.html from cache
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('/index.html').then(r => r ?? fetch(event.request))
    );
    return;
  }

  event.respondWith(networkFirst(event.request));
});

async function networkFirst(request) {
  try {
    const res = await fetch(request);
    if (res.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, res.clone());
    }
    return res;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    return new Response(JSON.stringify({ offline: true, message: 'Offline — showing cached data' }), {
      headers: { 'Content-Type': 'application/json' }, status: 503,
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  const res = await fetch(request);
  if (res.ok) {
    const cache = await caches.open(STATIC_CACHE);
    cache.put(request, res.clone());
  }
  return res;
}

// ── Background Sync (offline mutations) ───────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sewa-offline-sync') {
    event.waitUntil(syncOfflineQueue());
  }
});

async function syncOfflineQueue() {
  // Retrieve queued requests from IndexedDB (offline store)
  // In production, reads from sewa-offline Zustand-persisted IndexedDB
  console.log('[SW] Syncing offline queue...');
}

// ── Push Notifications (Feature 6) ────────────────────────────
self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const urgency = data.urgency || 'NORMAL';

  const options = {
    body:    data.body  || 'New SEWA XAI notification',
    icon:    '/icons/icon-192.png',
    badge:   '/icons/badge-72.png',
    vibrate: urgency === 'CRITICAL' ? [500, 250, 500, 250, 500] : [200],
    tag:     data.scanId || 'sewa-notification',
    data:    data,
    requireInteraction: urgency === 'CRITICAL',
    actions: urgency !== 'NORMAL' ? [
      { action: 'review', title: 'Review Now' },
      { action: 'dismiss', title: 'Dismiss' },
    ] : [],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SEWA XAI', options)
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
          if ('focus' in client) { client.focus(); client.postMessage({ type:'navigate', url }); return; }
        }
        return clients.openWindow(url);
      })
    );
  }
});
