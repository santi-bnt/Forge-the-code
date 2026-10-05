const CACHE = 'codebook-v1';
const CORE = ['/', '/index.html', '/manifest.webmanifest', '/icon.svg'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(CORE)));
});
self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key.startsWith('codebook-') && key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});
self.addEventListener('message', event => {
  if (event.data?.type === 'SKIP_WAITING') { event.waitUntil(self.skipWaiting()); return; }
  if (event.data?.type !== 'DOWNLOAD_OFFLINE' && event.data?.type !== 'GET_OFFLINE_STATUS') return;
  event.waitUntil((async () => {
    try {
      const response = await fetch('/offline-assets.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Asset manifest unavailable (${response.status})`);
      const assets = await response.json();
      const cache = await caches.open(CACHE);
      let done = 0;
      const sizes = { lessons: 0, python: 0, native: 0, other: 0 };
      const groups = { lessons: { done: 0, total: 0 }, python: { done: 0, total: 0 }, native: { done: 0, total: 0 }, other: { done: 0, total: 0 } };
      const groupFor = asset => asset.includes('/runtimes/pyodide/') ? 'python' : asset.includes('/runtimes/runno/') ? 'native' : asset.includes('/assets/') ? 'lessons' : 'other';
      for (const asset of assets) groups[groupFor(asset)].total++;
      for (const asset of assets) {
        const group = groupFor(asset);
        try {
          let cached = await cache.match(asset);
          if (!cached && event.data.type === 'DOWNLOAD_OFFLINE') { await cache.add(asset); cached = await cache.match(asset); }
          if (cached) {
            done++;
            groups[group].done++;
            sizes[group] += (await cached.blob()).size;
          }
        } catch (error) { event.source?.postMessage({ type: 'OFFLINE_ERROR', asset, message: String(error) }); return; }
        if (event.data.type === 'DOWNLOAD_OFFLINE') event.source?.postMessage({ type: 'OFFLINE_PROGRESS', done, total: assets.length, groups });
      }
      event.source?.postMessage({ type: 'OFFLINE_STATUS', ready: done === assets.length, done, total: assets.length, sizes, groups });
    } catch (error) {
      event.source?.postMessage({ type: 'OFFLINE_ERROR', asset: 'offline-assets.json', message: String(error) });
    }
  })());
});
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith((async () => {
    const cached = await caches.match(event.request);
    if (cached) return cached;
    try {
      const response = await fetch(event.request);
      if (response.ok) caches.open(CACHE).then(cache => cache.put(event.request, response.clone()));
      return response;
    } catch (error) {
      if (event.request.mode === 'navigate') return (await caches.match('/index.html')) ?? Response.error();
      throw error;
    }
  })());
});
