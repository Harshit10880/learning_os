// LearnOS Service Worker — PWA Phase 1
// Strategy: Cache-first for assets, Network-first for HTML/API

const CACHE_NAME = 'learnos-v1';
const OFFLINE_URL = '/offline.html';

// Static assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/offline.html',
  '/manifest.json',
  '/icon-192.png',
  '/icon-512.png',
  'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth-compat.js',
  'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore-compat.js'
];

// ── Install ──────────────────────────────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Cache what we can, ignore failures for external resources
      return Promise.allSettled(
        PRECACHE_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// ── Activate ─────────────────────────────────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── Fetch Strategy ───────────────────────────────────────────────────
self.addEventListener('fetch', event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET and Firebase API calls — always go to network
  if (request.method !== 'GET') return;
  if (url.hostname.includes('firebaseio.com')) return;
  if (url.hostname.includes('googleapis.com') && url.pathname.includes('/v1/')) return;
  if (url.hostname.includes('identitytoolkit')) return;
  if (url.hostname.includes('securetoken')) return;

  // HTML pages — Network first, fall back to cache, then offline page
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(request)
        .then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        })
        .catch(() =>
          caches.match(request)
            .then(cached => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  // Static assets (fonts, scripts, images) — Cache first, then network
  if (
    url.hostname.includes('fonts.googleapis.com') ||
    url.hostname.includes('fonts.gstatic.com') ||
    url.hostname.includes('cdnjs.cloudflare.com') ||
    url.hostname.includes('gstatic.com') ||
    request.destination === 'script' ||
    request.destination === 'style' ||
    request.destination === 'font' ||
    request.destination === 'image'
  ) {
    event.respondWith(
      caches.match(request).then(cached => {
        if (cached) return cached;
        return fetch(request).then(res => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
          return res;
        }).catch(() => new Response('', { status: 408 }));
      })
    );
    return;
  }

  // Everything else — Network first
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// ── Background Sync (for offline queued actions) ──────────────────────
self.addEventListener('sync', event => {
  if (event.tag === 'learnos-sync') {
    event.waitUntil(
      // Notify all clients to sync pending data
      self.clients.matchAll().then(clients =>
        clients.forEach(client => client.postMessage({ type: 'SYNC_REQUIRED' }))
      )
    );
  }
});

// ── Push Notifications (future) ───────────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'LearnOS', {
      body: data.body || 'You have a new notification',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'learnos-notification',
      renotify: true,
      data: { url: data.url || '/' }
    })
  );
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data?.url || '/')
  );
});
