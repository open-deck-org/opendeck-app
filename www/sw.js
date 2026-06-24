// App-shell service worker — runs on the SHELL origin (A) only.
//
// Purpose: make the web/PWA build installable and fully offline-capable, which
// is what an installed PWA (route 2a) and a Microsoft Store / PWABuilder MSIX
// (route 2b) both require. Without a shell SW the app can't relaunch offline and
// fails Store certification's offline check. (This is the piece D15/D22 marked
// "deferred"; it is now shipped.)
//
// Scope: this SW caches and serves ONLY same-origin (A) assets — the library UI
// shell. It deliberately does NOT touch the deck-runtime origin (B,
// decks.<host>): decks are cross-origin and served by B's OWN service worker
// (www-deck/sw.js) from B's IndexedDB, so deck isolation is unchanged and this
// SW never sees deck bytes. Native builds (Capacitor) never register this — see
// the !isNative() guard in js/app.js.
//
// Strategy:
//   - navigations            -> network-first, fall back to the cached shell
//                               (so an online launch gets fresh HTML, an offline
//                               launch still opens).
//   - other same-origin GETs -> stale-while-revalidate (instant from cache,
//                               refreshed in the background when online).
// Bump CACHE_VERSION to invalidate everything on the next visit.

const CACHE_VERSION = 'v1';
const CACHE = `opendeck-shell-${CACHE_VERSION}`;

// The shell core. Kept small and explicit (no bundler/build step in this repo):
// index + manifest + styles + every JS module + icons + fonts + the one vendor
// file. The bundled sample decks (~6.5 MB under samples/) are intentionally NOT
// precached — they are large, are imported into IndexedDB on first (online) run,
// and are picked up by the runtime cache if ever re-fetched.
const CORE = [
  './',
  './index.html',
  './manifest.webmanifest',
  './styles.css',
  './js/app.js',
  './js/platform.js',
  './js/store.js',
  './js/player.js',
  './js/deckbridge.js',
  './js/seed.js',
  './js/icons.js',
  './js/mime.js',
  './js/unzip.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './fonts/inter-latin.woff2',
  './fonts/newsreader-latin.woff2',
  './fonts/newsreader-italic-latin.woff2',
  './vendor/fflate.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // addAll is atomic — a single 404 would reject the install, so CORE must
      // stay in sync with the files actually shipped in www/.
      .then((cache) => cache.addAll(CORE)),
  );
});

self.addEventListener('activate', (event) => {
  // Note: we deliberately do NOT call clients.claim(). On a first-ever install
  // claiming would take over the page mid-boot, racing the one-shot first-run
  // seed (seed.js fetches the bundled decks as the SW is activating). Instead the
  // SW controls from the NEXT navigation — the first load is served entirely by
  // the network (clean seed), and every relaunch (including offline) is
  // controlled. Only old caches are reaped here.
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k.startsWith('opendeck-shell-') && k !== CACHE)
        .map((k) => caches.delete(k)),
    )),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Only ever handle our own origin. Cross-origin requests — most importantly
  // the deck-runtime (B) iframes and its bridge — pass straight through so B's
  // service worker keeps full control of deck serving and isolation.
  if (url.origin !== self.location.origin) return;

  // Navigations: network-first so an online launch always gets fresh HTML;
  // fall back to the cached shell when offline so the app still opens.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match('./index.html').then((m) => m || caches.match('./'))),
    );
    return;
  }

  // Everything else same-origin: stale-while-revalidate.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          // Only cache complete, same-origin OK responses (skip opaque/partials).
          if (res && res.status === 200 && res.type === 'basic') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
