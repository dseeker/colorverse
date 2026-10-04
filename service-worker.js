/**
 * ColorVerse Service Worker
 * Provides offline support, intelligent caching, and performance optimizations
 * Version: 1.0.0
 */

const CACHE_NAME = "colorverse-v2";
const STATIC_CACHE = "colorverse-static-v2";
const IMAGE_CACHE = "colorverse-images-v1";
const API_CACHE = "colorverse-api-v1";

// Assets to cache immediately on install
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/app.js",
  "/offline.html",
  "/src/services/seoManager.js",
  "/src/services/favoritesManager.js",
  "/src/services/searchManager.js",
  "/src/services/coloringTipsManager.js",
  "/robots.txt",
];

// External resources to cache
const EXTERNAL_RESOURCES = [
  "https://cdn.tailwindcss.com",
  "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css",
];

// Install event - cache static assets
self.addEventListener("install", event => {
  console.log("[SW] Installing ColorVerse Service Worker...");

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then(cache => {
        console.log("[SW] Caching static assets...");
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log("[SW] Static assets cached successfully");
        return self.skipWaiting();
      })
      .catch(error => {
        console.error("[SW] Failed to cache static assets:", error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener("activate", event => {
  console.log("[SW] Activating ColorVerse Service Worker...");

  event.waitUntil(
    caches
      .keys()
      .then(cacheNames => {
        return Promise.all(
          cacheNames.map(cacheName => {
            // Delete old versions of our caches
            if (
              cacheName.startsWith("colorverse-") &&
              cacheName !== STATIC_CACHE &&
              cacheName !== IMAGE_CACHE &&
              cacheName !== API_CACHE
            ) {
              console.log("[SW] Deleting old cache:", cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
      .then(() => {
        console.log("[SW] Service Worker activated");
        return self.clients.claim();
      })
  );
});

// Fetch event - implement caching strategies
self.addEventListener("fetch", event => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // Skip chrome-extension and other non-http protocols
  if (!url.protocol.startsWith("http")) {
    return;
  }

  // Strategy 1: Cache First for static assets
  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Strategy 2: Stale While Revalidate for images
  if (isImage(request)) {
    event.respondWith(staleWhileRevalidate(request, IMAGE_CACHE));
    return;
  }

  // Strategy 3: Network First for API calls
  if (isAPI(request)) {
    event.respondWith(networkFirst(request, API_CACHE));
    return;
  }

  // Strategy 4: Network with Cache Fallback for everything else
  event.respondWith(networkWithCacheFallback(request));
});

// Helper functions
function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    STATIC_ASSETS.includes(url.pathname) ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".html") ||
    url.pathname === "/"
  );
}

function isImage(request) {
  return (
    request.destination === "image" ||
    request.url.match(/\.(jpg|jpeg|png|gif|webp|svg|ico)$/i) ||
    request.url.includes("pollinations.ai/image")
  );
}

function isAPI(request) {
  return (
    request.url.includes("pollinations.ai") ||
    (request.destination === "script" && request.url.includes("api"))
  );
}

// Caching Strategies

// Cache First: Serve from cache, fallback to network
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    console.log("[SW] Serving from cache:", request.url);
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error("[SW] Failed to fetch:", request.url, error);
    // Return offline fallback if available
    return caches.match("/offline.html");
  }
}

// Stale While Revalidate: Serve cached, update in background
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Fetch in background to update cache
  const fetchPromise = fetch(request)
    .then(response => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(error => {
      console.log("[SW] Background fetch failed:", error);
    });

  // Return cached version immediately if available
  if (cached) {
    console.log("[SW] Serving stale image from cache");
    void fetchPromise; // Trigger background update (fire-and-forget)
    return cached;
  }

  // If not cached, wait for fetch
  console.log("[SW] Fetching fresh image");
  return fetchPromise;
}

// Network First: Try network, fallback to cache
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    console.log("[SW] Network failed, trying cache:", request.url);
    const cached = await cache.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Network with Cache Fallback
async function networkWithCacheFallback(request) {
  try {
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log("[SW] Network failed, trying cache");
    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }
    throw error;
  }
}

// Background Sync for offline actions
self.addEventListener("sync", event => {
  if (event.tag === "sync-favorites") {
    event.waitUntil(syncFavorites());
  }
});

async function syncFavorites() {
  console.log("[SW] Syncing favorites...");
  // Implementation for syncing favorites when back online
  // This would sync with a backend if one existed
}

// Push notifications (for future use)
self.addEventListener("push", event => {
  if (event.data) {
    const data = event.data.json();
    const options = {
      body: data.body,
      icon: "/assets/icon-192x192.png",
      badge: "/assets/badge-72x72.png",
      tag: data.tag,
      requireInteraction: true,
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
  }
});

// Notification click handler
self.addEventListener("notificationclick", event => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: "window" }).then(clientList => {
      if (clientList.length > 0) {
        clientList[0].focus();
      } else {
        clients.openWindow("/");
      }
    })
  );
});

// Message handler from main thread
self.addEventListener("message", event => {
  if (event.data === "skipWaiting") {
    self.skipWaiting();
  }

  if (event.data.type === "CLEAR_CACHE") {
    caches.keys().then(cacheNames => {
      return Promise.all(cacheNames.map(cacheName => caches.delete(cacheName)));
    });
  }
});
