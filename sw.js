const CACHE_NAME = 'miticure-timer-cache-v1';
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './script.js',
    './manifest.json',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// Install a service worker
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
    );
});

// Cache and return requests
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
                vibrate: [200, 100, 200], // Vibrate pattern
            });
        }, duration * 1000);
    }
});