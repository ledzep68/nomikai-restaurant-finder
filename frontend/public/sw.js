const CACHE_NAME = 'nomikai-v1';
const STATIC_CACHE = 'static-v1';
const DYNAMIC_CACHE = 'dynamic-v1';

// Files to cache immediately
const STATIC_FILES = [
  '/',
  '/index.html',
  '/manifest.json',
  '/static/js/bundle.js',
  '/static/css/main.css',
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/restaurants/,
  /\/api\/search/,
];

// Install event - cache static files
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...');
  
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('Caching static files');
        return cache.addAll(STATIC_FILES);
      })
      .catch((error) => {
        console.error('Failed to cache static files:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
              console.log('Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      })
  );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Handle API requests
  if (API_CACHE_PATTERNS.some(pattern => pattern.test(url.pathname))) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle static files
  if (request.method === 'GET') {
    event.respondWith(handleStaticRequest(request));
  }
});

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache successful responses
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
      return networkResponse;
    }
    
    throw new Error('Network response not ok');
  } catch (error) {
    console.log('Network failed, trying cache:', error);
    
    // Fall back to cache
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline fallback for search requests
    if (request.url.includes('/api/search')) {
      return new Response(
        JSON.stringify({
          success: false,
          message: 'オフラインです。インターネット接続を確認してください。',
          restaurants: [],
          cached: true,
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    
    // Return generic offline response
    return new Response(
      JSON.stringify({
        success: false,
        message: 'オフラインです',
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

// Handle static requests with cache-first strategy
async function handleStaticRequest(request) {
  // Skip unsupported URL schemes
  if (request.url.startsWith('chrome-extension:') || 
      request.url.startsWith('moz-extension:') ||
      request.url.startsWith('webkit-extension:')) {
    return fetch(request);
  }

  try {
    // Try cache first
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Fall back to network
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      // Cache the response
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('Both cache and network failed:', error);
    
    // Return offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlineResponse = await caches.match('/index.html');
      return offlineResponse || new Response('オフラインです', { 
        status: 503,
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    return new Response('Resource not available offline', { status: 503 });
  }
}

// Handle background sync for failed requests
self.addEventListener('sync', (event) => {
  console.log('Background sync triggered:', event.tag);
  
  if (event.tag === 'background-sync') {
    event.waitUntil(handleBackgroundSync());
  }
});

async function handleBackgroundSync() {
  try {
    // Get failed requests from IndexedDB or localStorage
    const failedRequests = await getFailedRequests();
    
    for (const request of failedRequests) {
      try {
        await fetch(request.url, request.options);
        // Remove from failed requests queue
        await removeFailedRequest(request.id);
      } catch (error) {
        console.log('Background sync failed for:', request.url);
      }
    }
  } catch (error) {
    console.error('Background sync error:', error);
  }
}

// Helper functions for failed requests queue
async function getFailedRequests() {
  // This would typically use IndexedDB
  // For simplicity, using localStorage
  try {
    const requests = localStorage.getItem('failed-requests');
    return requests ? JSON.parse(requests) : [];
  } catch {
    return [];
  }
}

async function removeFailedRequest(id) {
  try {
    const requests = await getFailedRequests();
    const filteredRequests = requests.filter(req => req.id !== id);
    localStorage.setItem('failed-requests', JSON.stringify(filteredRequests));
  } catch (error) {
    console.error('Failed to remove request:', error);
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  const options = {
    body: event.data ? event.data.text() : '新しい通知があります',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/badge-72x72.png',
    tag: 'nomikai-notification',
    actions: [
      {
        action: 'open',
        title: '開く',
      },
      {
        action: 'close',
        title: '閉じる',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification('Nomikai Restaurant Finder', options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'open') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});