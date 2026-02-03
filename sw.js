const CACHE_NAME = "temptrack-v7";
const SHELL_FILES = [
  "./",
  "index.html",
  "style.css",
  "app.js",
  "cities.js",
  "manifest.json",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_FILES))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);

  // Always fetch API calls and news RSS from network
  if (
    url.hostname.includes("open-meteo.com") ||
    url.hostname.includes("rss2json.com")
  ) {
    return;
  }

  // Cache-first for app shell
  e.respondWith(
    caches.match(e.request).then((cached) => cached || fetch(e.request))
  );
});
