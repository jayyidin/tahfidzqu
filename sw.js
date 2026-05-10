const CACHE_NAME = 'tahfidzqu-cache-v3';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './assets/css/base.css',
    './assets/js/app.js',
    './assets/js/firebase.js',
    './assets/js/sw-register.js'
];

// Install Service Worker & Simpan Asset Utama
self.addEventListener('install', event => {
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            return cache.addAll(ASSETS_TO_CACHE);
        })
    );
});

// Bersihkan Cache Lama jika ada versi baru
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys => Promise.all(
            keys.map(key => {
                if (key !== CACHE_NAME) return caches.delete(key);
            })
        ))
    );
});

// Intercept Fetch Request (Network First, Fallback to Cache)
self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET') return;
    
    event.respondWith(
        fetch(event.request).then(response => {
            let resClone = response.clone();
            caches.open(CACHE_NAME).then(cache => { if (event.request.url.startsWith('http')) cache.put(event.request, resClone); });
            return response;
        }).catch(() => caches.match(event.request).then(res => res || caches.match('./index.html')))
    );
});
