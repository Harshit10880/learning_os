// ╔══════════════════════════════════════════════════════════════════╗
// ║         LearnOS Service Worker — PWA Phase 2                    ║
// ║         Enhanced caching + Offline Queue + Background Sync      ║
// ╚══════════════════════════════════════════════════════════════════╝

const SW_VERSION   = 'learnos-v3';
const SHELL_CACHE  = 'learnos-shell-v3';   // App shell — rarely changes
const ASSET_CACHE  = 'learnos-assets-v3';  // Fonts, scripts, icons
const PAGE_CACHE   = 'learnos-pages-v3';   // HTML pages
const OFFLINE_URL  = '/offline.html';

// App Shell — cache immediately, serve always from cache
const SHELL_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  '/icon-maskable-192.png',
  '/icon-maskable-512.png',
];

// External assets — cache on first use
const EXTERNAL_ORIGINS = [
  'fonts.googleapis.com',
  'fonts.gstatic.com',
  'cdnjs.cloudflare.com',
  'www.gstatic.com',
];

// Firebase origins — NEVER cache (auth + data must be live)
const SKIP_CACHE_ORIGINS = [
  'firebaseio.com',
  'firestore.googleapis.com',
  'identitytoolkit.googleapis.com',
  'securetoken.googleapis.com',
  'firebasestorage.googleapis.com',
  'googleapis.com/identitytoolkit',
];

// ── INSTALL — Cache App Shell ────────────────────────────────────────
self.addEventListener('install', event => {
  console.log('[SW] Installing Phase 2…');
  event.waitUntil(
    Promise.all([
      caches.open(SHELL_CACHE).then(cache =>
        Promise.allSettled(SHELL_ASSETS.map(url =>
          cache.add(url).catch(e => console.warn('[SW] Shell cache miss:', url, e))
        ))
      ),
    ]).then(() => {
      console.log('[SW] Shell cached ✅');
      return self.skipWaiting();
    })
  );
});

// ── ACTIVATE — Clean old caches ──────────────────────────────────────
self.addEventListener('activate', event => {
  const VALID_CACHES = [SHELL_CACHE, ASSET_CACHE, PAGE_CACHE];
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => !VALID_CACHES.includes(k))
          .map(k => {
            console.log('[SW] Deleting old cache:', k);
            return caches.delete(k);
          })
      )
    ).then(() => {
      console.log('[SW] Activated Phase 2 ✅');
      return self.clients.claim();
    })
  );
});

// ── FETCH — Smart routing ────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Non-GET — pass through (POST/PUT for Firebase writes)
  if (request.method !== 'GET') return;

  // 2. Firebase & auth — always network, never cache
  if (SKIP_CACHE_ORIGINS.some(o => url.hostname.includes(o))) return;

  // 3. App Shell — Cache first, always fast
  if (SHELL_ASSETS.includes(url.pathname) && url.origin === self.location.origin) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // 4. External assets (fonts, scripts) — Cache first, update in background
  if (EXTERNAL_ORIGINS.some(o => url.hostname.includes(o))) {
    event.respondWith(staleWhileRevalidate(request, ASSET_CACHE));
    return;
  }

  // 5. Local scripts/styles/images — Cache first
  if (['script','style','font','image'].includes(request.destination)) {
    event.respondWith(cacheFirst(request, ASSET_CACHE));
    return;
  }

  // 6. HTML navigation — Network first, cache fallback, offline page
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(networkFirstWithOfflineFallback(request));
    return;
  }

  // 7. Everything else — Network first, cache fallback
  event.respondWith(networkFirst(request, PAGE_CACHE));
});

// ── CACHE STRATEGIES ─────────────────────────────────────────────────

// Cache First: serve from cache, fetch if missing
async function cacheFirst(request, cacheName) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('', { status: 408, statusText: 'Offline' });
  }
}

// Stale While Revalidate: serve cache immediately, update in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || await fetchPromise || new Response('', { status: 408 });
}

// Network First: try network, fall back to cache
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    return cached || new Response('', { status: 408 });
  }
}

// Network First with offline page fallback for navigation
async function networkFirstWithOfflineFallback(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(PAGE_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    const offlinePage = await caches.match(OFFLINE_URL);
    return offlinePage || new Response('<h1>Offline</h1>', {
      status: 503,
      headers: { 'Content-Type': 'text/html' }
    });
  }
}

// ── BACKGROUND SYNC ───────────────────────────────────────────────────
self.addEventListener('sync', event => {
  console.log('[SW] Background sync event:', event.tag);
  if (event.tag === 'learnos-offline-queue') {
    event.waitUntil(processOfflineQueue());
  }
});

async function processOfflineQueue() {
  // Notify all open clients to process their offline queue
  const clients = await self.clients.matchAll({ type: 'window' });
  clients.forEach(client => {
    client.postMessage({
      type: 'PROCESS_OFFLINE_QUEUE',
      timestamp: Date.now()
    });
  });
  console.log('[SW] Notified', clients.length, 'clients to sync offline queue');
}

// ── PERIODIC SYNC (keep cache fresh) ─────────────────────────────────
self.addEventListener('periodicsync', event => {
  if (event.tag === 'learnos-cache-refresh') {
    event.waitUntil(refreshShellCache());
  }
});

async function refreshShellCache() {
  const cache = await caches.open(SHELL_CACHE);
  await Promise.allSettled(
    SHELL_ASSETS.map(url =>
      fetch(url).then(r => r.ok && cache.put(url, r)).catch(() => {})
    )
  );
  console.log('[SW] Shell cache refreshed');
}

// ── PUSH NOTIFICATIONS ────────────────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'LearnOS', body: event.data.text() }; }

  event.waitUntil(
    self.registration.showNotification(data.title || 'LearnOS', {
      body:    data.body    || 'You have a notification',
      icon:    '/icon-192.png',
      badge:   '/icon-192.png',
      tag:     data.tag     || 'learnos',
      renotify: true,
      vibrate: [200, 100, 200],
      data:    { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then(clientList => {
      const url = event.notification.data?.url || '/';
      for (const client of clientList) {
        if (client.url === url && 'focus' in client) return client.focus();
      }
      return clients.openWindow(url);
    })
  );
});

// ── MESSAGE HANDLER ───────────────────────────────────────────────────
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
  if (event.data?.type === 'CACHE_URLS') {
    caches.open(ASSET_CACHE).then(cache =>
      Promise.allSettled((event.data.urls || []).map(url => cache.add(url)))
    );
  }
});
