const CACHE_NAME = 'miticure-timer-cache-v2'; // Bump cache name
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .then(() => self.skipWaiting()) // Force activation of new SW
    );
});

self.addEventListener('activate', event => {
    // Clean up old caches
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        return caches.delete(cacheName);
                    }
                })
            );
        }).then(() => self.clients.claim()) // Take control of open clients
    );
});

self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => response || fetch(event.request))
    );
});

self.addEventListener('message', event => {
    if (event.data && event.data.action === 'startTimer') {
        const { duration, title, body } = event.data;
        setTimeout(() => {
            self.registration.showNotification(title, {
                body: body,
                icon: './icons/icon-192.png',
                vibrate: [200, 100, 200],
            });
        }, duration * 1000);
    }
});
