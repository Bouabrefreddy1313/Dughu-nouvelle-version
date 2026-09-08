// Dughu Service Worker — Gestion des Notifications Push et Clics
// Version: 1.0.0

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Événement Push réseau standard (Web Push API)
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: 'Dughu', body: event.data.text() };
    }
  }

  const title = data.title || 'Dughu';
  const options = {
    body: data.body || data.text || 'Nouvelle interaction sur votre compte',
    icon: data.icon || '/images/favicon.png',
    badge: '/images/favicon.png',
    data: {
      url: data.url || '/home',
      id: data.id,
    },
    vibrate: [100, 50, 100],
    tag: data.tag || (data.id ? `dughu-notif-${data.id}` : 'dughu-notif'),
    renotify: true,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Clic sur une notification push
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = event.notification.data?.url || '/home';

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Si une fenêtre est déjà ouverte sur Dughu, on la met au premier plan et navigue
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            return client.navigate(targetUrl);
          }
          return;
        }
      }
      // Sinon, on ouvre une nouvelle fenêtre
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
