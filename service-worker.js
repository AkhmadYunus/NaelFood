// Service Worker Nael Food. NAIKKAN nomor VERSION setiap rilis agar pengguna mendapat versi baru.
const VERSION = 'v3';
const CACHE = 'nael-food-' + VERSION;
const SHELL = ['./', './index.html', './css/style.css', './js/app.js', './js/api.js', './js/cart.js', './manifest.json',
  './assets/images/icon-192.png', './assets/images/apple-touch-icon.png'];
// Host eksternal yang boleh di-cache agar tampilan tetap utuh saat offline
const CDN = ['cdn.tailwindcss.com', 'fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET') return;                                   // POST (order/API) tidak pernah disentuh
  const sameOrigin = url.origin === location.origin;
  if (!sameOrigin && !CDN.includes(url.hostname)) return;             // API Google Apps Script langsung ke jaringan
  if (sameOrigin && url.pathname.includes('/admin/')) return;         // halaman admin tidak di-cache
  if (req.mode === 'navigate') {                                      // halaman: jaringan dulu, cache jika offline
    e.respondWith(fetch(req).catch(() => caches.match('./index.html')));
    return;
  }
  e.respondWith(caches.match(req).then(hit => {                       // aset: cache dulu, perbarui di belakang layar
    const net = fetch(req).then(res => {
      if (res.ok || res.type === 'opaque') { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => hit);
    return hit || net;
  }));
});
