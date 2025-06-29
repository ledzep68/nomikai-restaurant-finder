// Service Worker registration and management

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  window.location.hostname.match(
    /^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/
  )
);

interface ServiceWorkerConfig {
  onSuccess?: (registration: ServiceWorkerRegistration) => void;
  onUpdate?: (registration: ServiceWorkerRegistration) => void;
  onOffline?: () => void;
  onOnline?: () => void;
}

export function registerSW(config?: ServiceWorkerConfig) {
  if ('serviceWorker' in navigator) {
    const publicUrl = new URL(import.meta.env.BASE_URL || '', window.location.href);
    if (publicUrl.origin !== window.location.origin) {
      return;
    }

    window.addEventListener('load', () => {
      const swUrl = `${import.meta.env.BASE_URL}sw.js`;

      if (isLocalhost) {
        // Development mode
        checkValidServiceWorker(swUrl, config);
        navigator.serviceWorker.ready.then(() => {
          console.log('Service worker ready in development mode');
        });
      } else {
        // Production mode
        registerValidSW(swUrl, config);
      }
    });
  }

  // Network status monitoring
  window.addEventListener('online', () => {
    console.log('App is online');
    config?.onOnline?.();
  });

  window.addEventListener('offline', () => {
    console.log('App is offline');
    config?.onOffline?.();
  });
}

async function registerValidSW(swUrl: string, config?: ServiceWorkerConfig) {
  try {
    const registration = await navigator.serviceWorker.register(swUrl);
    
    registration.onupdatefound = () => {
      const installingWorker = registration.installing;
      if (installingWorker == null) {
        return;
      }

      installingWorker.onstatechange = () => {
        if (installingWorker.state === 'installed') {
          if (navigator.serviceWorker.controller) {
            // New content available
            console.log('New content is available; please refresh.');
            config?.onUpdate?.(registration);
          } else {
            // Content cached for first time
            console.log('Content is cached for offline use.');
            config?.onSuccess?.(registration);
          }
        }
      };
    };

    // Enable background sync if supported
    if ('sync' in registration) {
      console.log('Background sync supported');
    }

    // Enable push notifications if supported
    if ('pushManager' in registration) {
      console.log('Push notifications supported');
    }

  } catch (error) {
    console.error('Error during service worker registration:', error);
  }
}

async function checkValidServiceWorker(swUrl: string, config?: ServiceWorkerConfig) {
  try {
    const response = await fetch(swUrl, {
      headers: { 'Service-Worker': 'script' },
    });

    const contentType = response.headers.get('content-type');
    if (
      response.status === 404 ||
      (contentType != null && contentType.indexOf('javascript') === -1)
    ) {
      // No service worker found or invalid content type
      const registration = await navigator.serviceWorker.ready;
      await registration.unregister();
      window.location.reload();
    } else {
      // Service worker found
      registerValidSW(swUrl, config);
    }
  } catch {
    console.log('No internet connection found. App is running in offline mode.');
    config?.onOffline?.();
  }
}

export function unregister() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
}

// Background sync helpers
export async function queueRequest(url: string, options: RequestInit) {
  if (!('serviceWorker' in navigator) || !('sync' in window.ServiceWorkerRegistration.prototype)) {
    // Fallback: try immediate request
    return fetch(url, options);
  }

  try {
    // Try immediate request first
    return await fetch(url, options);
  } catch (error) {
    // Queue for background sync
    const failedRequest = {
      id: Date.now().toString(),
      url,
      options: {
        method: options.method || 'GET',
        headers: options.headers,
        body: options.body,
      },
      timestamp: Date.now(),
    };

    // Store in localStorage (in production, use IndexedDB)
    const existingRequests = JSON.parse(localStorage.getItem('failed-requests') || '[]');
    existingRequests.push(failedRequest);
    localStorage.setItem('failed-requests', JSON.stringify(existingRequests));

    // Register for background sync
    const registration = await navigator.serviceWorker.ready;
    if ('sync' in registration) {
      await (registration as any).sync.register('background-sync');
    }

    throw error; // Re-throw to handle in UI
  }
}

// Push notification helpers
export async function subscribeToPushNotifications(): Promise<PushSubscription | null> {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    console.log('Push messaging is not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Subscribe to push notifications
      const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
      if (!vapidKey) {
        console.error('VAPID public key not found');
        return null;
      }

      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: vapidKey,
      });
    }

    return subscription;
  } catch (error) {
    console.error('Error subscribing to push notifications:', error);
    return null;
  }
}

export async function unsubscribeFromPushNotifications(): Promise<boolean> {
  if (!('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      return await subscription.unsubscribe();
    }
    
    return true;
  } catch (error) {
    console.error('Error unsubscribing from push notifications:', error);
    return false;
  }
}