self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { title: 'MonexaFX', body: event.data?.text() || 'You have a new account update.' };
  }

  event.waitUntil(self.registration.showNotification(payload.title || 'MonexaFX update', {
    body: payload.body || 'Open your account to view the latest update.',
    icon: '/favicon.jpeg',
    badge: '/favicon.jpeg',
    data: { url: payload.url || '/dashboard-home' },
    tag: payload.tag || 'monexafx-notification',
    renotify: false,
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const requestedUrl = new URL(event.notification.data?.url || '/dashboard-home', self.location.origin);
  const targetUrl = requestedUrl.origin === self.location.origin
    ? requestedUrl.href
    : new URL('/dashboard-home', self.location.origin).href;

  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existingWindow = windows.find((client) => client.url.startsWith(self.location.origin));

    if (existingWindow) {
      await existingWindow.navigate(targetUrl);
      return existingWindow.focus();
    }

    return self.clients.openWindow(targetUrl);
  })());
});
