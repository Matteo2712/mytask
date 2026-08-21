// MyTask — service worker
// Cache-first per gli asset statici, così l'app si apre anche offline.
// I dati (Supabase) NON passano da qui: li gestisce app.js con la coda
// localStorage-first descritta nel playbook.

// Nome cache fisso: non serve più incrementarlo a ogni deploy.
// index.html (e le altre pagine HTML/navigazioni) usano network-first,
// quindi arriva sempre l'ultima versione pubblicata quando c'è connessione;
// solo se sei offline si usa la copia in cache. Gli altri asset statici
// (manifest, icone) restano cache-first per velocità.
const CACHE_NAME = 'mytask-cache-v1';
const PRECACHE_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_URLS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Non intercettare le chiamate verso Supabase: devono sempre andare in rete
  // (o fallire, cosa che app.js gestisce con la coda di sync).
  if (request.url.includes('supabase.co')) return;

  if (request.method !== 'GET') return;

  // Navigazioni (apertura app / index.html): network-first, così l'ultima
  // versione pubblicata arriva sempre subito, senza dover cambiare questo
  // file a ogni release. Fallback alla cache solo se sei offline.
  const isNavigation =
    request.mode === 'navigate' || request.url.endsWith('/index.html') || request.url.endsWith('/');

  if (isNavigation) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/index.html')))
    );
    return;
  }

  // Altri asset statici (manifest, icone): cache-first, con aggiornamento
  // in background della cache.
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return response;
        })
        .catch(() => caches.match('/index.html'));
    })
  );
});
