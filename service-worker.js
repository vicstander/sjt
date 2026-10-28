// Minimal app-shell cache. This lets the app open instantly and work
// offline for browsing the reading plan; Read/Listen still need a live
// connection since they fetch fresh text/audio from api.esv.org.
//
// IMPORTANT: bump this version string any time index.html/app.js/manifest
// change, so installed devices pick up the update instead of serving a
// stale cached copy.
var CACHE_NAME = "sjt-shell-v3";
var SHELL_FILES = [
  "./index.html",
  "./app.js",
  "./plan.js",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(SHELL_FILES);
    })
  );
  self.skipWaiting();
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(
        names
          .filter(function (name) { return name !== CACHE_NAME; })
          .map(function (name) { return caches.delete(name); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener("fetch", function (event) {
  var url = new URL(event.request.url);

  // Never intercept calls to the ESV API — always go to the network.
  if (url.hostname.indexOf("esv.org") !== -1) return;

  if (event.request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Network-first for the app shell: always try to get the latest file,
  // and only fall back to the cached copy if the network is unavailable.
  // This guarantees fixes/updates show up immediately instead of being
  // masked by a stale cache.
  event.respondWith(
    fetch(event.request)
      .then(function (response) {
        if (response.ok) {
          var copy = response.clone();
          caches.open(CACHE_NAME).then(function (cache) {
            cache.put(event.request, copy);
          });
        }
        return response;
      })
      .catch(function () {
        return caches.match(event.request);
      })
  );
});
