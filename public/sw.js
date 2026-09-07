// ============================================================================
// Service Worker — runtime cache stratégia (cache-first s network fallback).
//
// Cache busting:
//   - bump CACHE_NAME pri každom release, activate event premaže starý cache
//   - Vite build môže JS súbory hashovať, takže ich neprecachujeme pri install,
//     iba pri prvom fetch ich uložíme (bezpečné pri akejkoľvek build konfigurácii)
//
// Dev mode:
//   - localhost / 127.* / LAN private ranges → sieť bypass (žiadny cache)
//   - dôvod: vite dev --host serveruje cez LAN IP, chceme čerstvé requesty
// ============================================================================

const CACHE_NAME = "TimeHolder-v1.7.0";

// Iba esenciálne statické súbory s predvídateľnými cestami.
// JS a CSS sa zacachujú runtime pri prvom fetch (fix pre hashované filenames).
const PRECACHE_URLS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./favicon.ico",
  "./favicon-16x16.png",
  "./favicon-32x32.png",
  "./apple-touch-icon.png",
  "./icons/android-chrome-192x192.png",
  "./icons/android-chrome-512x512.png",
];

function isDevEnv() {
  const h = self.location.hostname;
  return /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(h);
}

// INSTALL — precache esenciálnych súborov
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS)),
  );
});

// FETCH — dev: vždy sieť. Prod: cache-first, pri miss network + auto-fill cache.
self.addEventListener("fetch", (event) => {
  if (isDevEnv()) {
    return event.respondWith(fetch(event.request));
  }

  if (event.request.method !== "GET") return;

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (response.ok && response.type === "basic") {
          const copy = response.clone();
          caches
            .open(CACHE_NAME)
            .then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    }),
  );
});

// ACTIVATE — zmazať staré cache
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      ),
  );
});
