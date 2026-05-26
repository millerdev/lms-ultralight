// Service worker for Ultralight.
// Provides the fetch handler required for Chrome PWA installability.
// Uses a simple pass-through network strategy — no offline cache needed
// since the LMS server is expected to always be reachable locally.

self.addEventListener('install', () => self.skipWaiting())

self.addEventListener('activate', event => event.waitUntil(clients.claim()))

self.addEventListener('fetch', event => {
  event.respondWith(fetch(event.request))
})
