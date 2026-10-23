// Ray - service worker (makes the app installable; the live data always comes from the network)
const CACHE = 'ray-shell-v4';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const u = new URL(e.request.url);
  if (u.origin !== location.origin) return;            // Google Script requests go straight to the network
  e.respondWith(fetch(e.request).then(r => { const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); return r; }).catch(() => caches.match(e.request)));
});

// ---- notifications (v3): Google sends an empty push; ask Ray for the waiting messages and show them
const APP = 'https://script.google.com/macros/s/AKfycbxDoDZvOjM3PbnUue0STDechP11MBwBCDf5GFSO5rEs0bbjYn4izqcZPDgIv_0KqTcIZw/exec';
self.addEventListener('push', e => {
  e.waitUntil((async () => {
    let items = [];
    try {
      const sub = await self.registration.pushManager.getSubscription();
      const r = await fetch(APP + '?notif=1&ep=' + encodeURIComponent(sub ? sub.endpoint : ''), { cache: 'no-store' });
      const j = await r.json(); items = j.items || [];
    } catch (err) {}
    if (!items.length) items = [{ title: 'Ray', body: 'تحديث جديد على أوامر الشراء' }];
    await Promise.all(items.map((it, i) => self.registration.showNotification(it.title, {
      body: it.body, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'ray-' + Date.now() + '-' + i, data: { url: './?v=po' } })));
  })());
});
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({ type: 'window', includeUncontrolled: true }).then(cs => {
    for (const c of cs) if ('focus' in c) return c.focus();
    return clients.openWindow((e.notification.data && e.notification.data.url) || './');
  }));
});
