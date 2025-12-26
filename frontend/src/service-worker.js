/* eslint-disable no-restricted-globals */

// Basic service worker: caches app shell for faster repeat loads.
// This is minimal and safe to start with.

const CACHE_NAME = "ssj-cache-v1";
const APP_SHELL = ["/", "/index.html", "/manifest.json"];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => (key !== CACHE_NAME ? caches.delete(key) : null))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== "GET") return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      const res = await fetch(request);
      // Cache successful same-origin responses
      try {
        const url = new URL(request.url);
        if (url.origin === self.location.origin && res.status === 200) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, res.clone());
        }
      } catch (e) {}
      return res;
    })()
  );
});
