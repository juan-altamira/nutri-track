/// <reference types="@sveltejs/kit" />
/// <reference no-default-lib="true"/>
/// <reference lib="esnext" />
/// <reference lib="webworker" />

const sw = /** @type {ServiceWorkerGlobalScope} */ (/** @type {unknown} */ (self));

const CACHE_NAME = 'nutri-track-v3';
const STATIC_CACHE = 'nutri-track-static-v3';

// Archivos estáticos críticos para cachear
const STATIC_ASSETS = [
  '/',
  '/manifest.json',
  '/robots.txt'
];

// Instalación del Service Worker
sw.addEventListener('install', (event) => {
  console.log('[SW] Instalando Service Worker...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('[SW] Cacheando archivos estáticos');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  sw.skipWaiting();
});

// Activación del Service Worker
sw.addEventListener('activate', (event) => {
  console.log('[SW] Activando Service Worker...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME && cacheName !== STATIC_CACHE) {
            console.log('[SW] Eliminando caché antigua:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  sw.clients.claim();
});

// Interceptar solicitudes de red
sw.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar solicitudes de extensiones del navegador
  if (url.protocol === 'chrome-extension:') return;

  // NO cachear métodos POST, PUT, DELETE, PATCH, HEAD
  // Solo cachear GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Estrategia: Network First con fallback a caché (para API de Supabase)
  if (url.hostname.includes('supabase.co')) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Clonar la respuesta para guardarla en caché
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        })
        .catch(() => {
          // Si falla la red, intentar servir desde caché
          return caches.match(request).then((response) => {
            return response || new Response('Offline', { status: 503 });
          });
        })
    );
    return;
  }

  // Estrategia: Cache First para assets estáticos
  if (
    request.destination === 'image' ||
    request.destination === 'style' ||
    request.destination === 'script' ||
    request.destination === 'font'
  ) {
    event.respondWith(
      caches.match(request).then((response) => {
        return (
          response ||
          fetch(request).then((fetchResponse) => {
            return caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, fetchResponse.clone());
              return fetchResponse;
            });
          })
        );
      })
    );
    return;
  }

  // Para todo lo demás: Network First
  event.respondWith(
    fetch(request)
      .then((response) => {
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(request, responseToCache);
        });
        return response;
      })
      .catch(() => {
        return caches.match(request).then((response) => {
          return response || caches.match('/');
        });
      })
  );
});

// Manejar mensajes del cliente
sw.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    sw.skipWaiting();
  }
});
