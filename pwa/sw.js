/* Treffpunkt service worker. The precache list and version are filled in at build (pwa/vite-plugin-sw.ts). */
/* global PRECACHE, VERSION */ // declared by the line the build puts above this file
const APP_CACHE = `treffpunkt-app-${VERSION}`;
const FONT_CACHE = "treffpunkt-fonts-v1";

self.addEventListener("install", (event) => {
  // Every screen, including lazily loaded ones, works offline from the first visit.
  event.waitUntil(
    caches
      .open(APP_CACHE)
      .then((cache) => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== APP_CACHE && key !== FONT_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);

  // App start: serve the cached shell at once (weak signal at the range must not
  // stall startup). The shell and its assets come from the same build, and a new
  // build is picked up by the next service worker update.
  if (request.mode === "navigate" && url.origin === self.location.origin) {
    event.respondWith(
      caches.match("/index.html", { cacheName: APP_CACHE }).then((hit) => hit || fetch(request)),
    );
    return;
  }

  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(request, { cacheName: APP_CACHE }).then((hit) => hit || fetch(request)),
    );
    return;
  }

  if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com") {
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(request).then((hit) => {
          const network = fetch(request).then((response) => {
            // Only CORS responses: opaque ones count ~7 MB each against the quota.
            if (response.ok && response.type !== "opaque")
              void cache.put(request, response.clone());
            return response;
          });
          return hit || network;
        }),
      ),
    );
  }
});
