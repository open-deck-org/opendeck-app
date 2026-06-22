// Deck server for the web / PWA path.
//
// Serves /__deck__/<id>/<path...> from the SAME IndexedDB that store.js writes
// to, giving decks a real HTTP origin (relative URLs, ES modules, fetch all
// work). The player frame keeps `allow-same-origin` here because a service
// worker cannot control an opaque-origin frame — so on web a deck shares the
// shell origin (weaker isolation than the per-deck origins used on device).
//
// We can't make a deck cross-origin on web without abandoning the SW, but we
// CAN stop it exfiltrating: the CSP below allows no remote hosts, so a deck
// cannot phone home (it still can't be prevented from reading same-origin data,
// which CSP doesn't gate — see docs/ARCHITECTURE.md "web" boundary).
//
// On native, this file is unused — the deck:// scheme handler does the same job.

const DB_NAME = 'opendeck';
const PREFIX = '/__deck__/';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (url.origin === self.location.origin && url.pathname.startsWith(PREFIX)) {
    event.respondWith(serveDeckFile(decodeURIComponent(url.pathname)));
  }
});

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db, store, key) {
  return new Promise((resolve, reject) => {
    const r = db.transaction(store).objectStore(store).get(key);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  });
}

async function serveDeckFile(pathname) {
  const rest = pathname.slice(PREFIX.length);   // "<id>/<path...>"
  const slash = rest.indexOf('/');
  const id = slash === -1 ? rest : rest.slice(0, slash);
  const path = slash === -1 ? 'index.html' : (rest.slice(slash + 1) || 'index.html');

  try {
    const db = await openDB();
    const rec = await idbGet(db, 'files', `${id}/${path}`);
    if (!rec) return new Response('Not found', { status: 404 });
    return new Response(rec.data, {
      status: 200,
      headers: {
        'Content-Type': rec.mime || 'application/octet-stream',
        // No Access-Control-Allow-Origin: the deck frame is same-origin to the
        // shell here, so it needs no CORS to load its own resources, and '*'
        // would only widen reach for no benefit.
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        // Block network exfiltration: no remote host is allowed anywhere. 'self'
        // is the shell origin (where the SW serves), so a deck can still read
        // same-origin data — CSP can't stop that — but it cannot send it out.
        'Content-Security-Policy':
          "default-src 'self' blob: data:; img-src 'self' blob: data:; " +
          "media-src 'self' blob: data:; font-src 'self' data:; " +
          "style-src 'self' 'unsafe-inline'; " +
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' blob: data:",
      },
    });
  } catch (err) {
    return new Response('Deck store error: ' + err.message, { status: 500 });
  }
}
