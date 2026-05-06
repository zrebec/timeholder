const CACHE_NAME = 'WorkHolder-v1.5.2RC';
const urlsToCache = [
    './index.html',
    './styles.css',
    './script.js',
    './manifest.json',
    './favicon.ico',
    './apple-touch-icon.png',
    './android-chrome-192x192.png',
    './android-chrome-512x512.png'
];

function isDevEnv() {
    return self.location.hostname === 'localhost' 
        || self.location.hostname === '127.0.0.1';
}

// INSTALL — cache iba v produkcii
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(urlsToCache))
    );
});

// FETCH — dev → ide vždy na sieť, prod → cache-first
self.addEventListener('fetch', event => {
    if (isDevEnv()) {
        return event.respondWith(fetch(event.request)); // DEV: žiadny cache
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

// ACTIVATE — mazanie starého cache
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames =>
            Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            )
        )
    );
});
