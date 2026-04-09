/*! coi-service-worker v0.1.7 - Guido Zuidhof, licensed under MIT */
let coepCredentialless = false;
if (typeof window === 'undefined') {
  self.addEventListener('install', () => self.skipWaiting());
  self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
  self.addEventListener('message', (ev) => {
    if (ev.data && ev.data.type === 'deregister') {
      self.registration
        .unregister()
        .then(() => self.clients.matchAll())
        .then((clients) => clients.forEach((client) => client.navigate(client.url)));
    }
  });
  self.addEventListener('fetch', function (event) {
    if (event.request.cache === 'only-if-cached' && event.request.mode !== 'same-origin') return;
    event.respondWith(
      fetch(event.request).then((response) => {
        if (response.status === 0) return response;
        const newHeaders = new Headers(response.headers);
        newHeaders.set('Cross-Origin-Embedder-Policy', coepCredentialless ? 'credentialless' : 'require-corp');
        newHeaders.set('Cross-Origin-Opener-Policy', 'same-origin');
        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: newHeaders,
        });
      }).catch((e) => console.error(e))
    );
  });
} else {
  (() => {
    if (window.crossOriginIsolated !== false) return;
    const r = window.navigator.serviceWorker.register(window.document.currentScript.src, { scope: './' });
    r.then((registration) => {
      if (registration.active && !navigator.serviceWorker.controller) {
        window.location.reload();
      }
    });
    let reloadedBySelf = false;
    const check = () => {
      if (reloadedBySelf) return;
      if (window.crossOriginIsolated) return;
      reloadedBySelf = true;
      window.location.reload();
    };
    window.navigator.serviceWorker.addEventListener('controllerchange', check);
    check();
  })();
}
