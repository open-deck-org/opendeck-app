// Deck server for the web / PWA path.
//
// Serves /__deck__/<id>/<path...> from the SAME IndexedDB that store.js writes
// to, giving decks a real HTTP origin (relative URLs, ES modules, fetch all
// work). The player loads decks in an opaque-origin sandboxed iframe, so the
// `Access-Control-Allow-Origin: *` header below lets the deck fetch its own
// relative resources across that opaque-origin boundary.
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
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-store',
        // Defense in depth: a deck cannot frame-bust or navigate the top shell.
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (err) {
    return new Response('Deck store error: ' + err.message, { status: 500 });
  }
}
