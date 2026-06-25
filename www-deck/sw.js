// Deck-runtime service worker — runs on the DEDICATED deck origin (B), NOT the
// shell origin (A). See docs/DECISIONS.md D22.
//
// The shell (A) hands deck bytes to bridge.html (B) via postMessage; the bridge
// writes them into THIS origin's IndexedDB, and this SW serves them at
// /__deck__/<id>/<path>. Because B is a different origin than the shell, the
// deck iframe is cross-origin to the shell — it cannot reach the shell DOM, the
// library store, or window.parent.

const DB_NAME = 'opendeck-deck-runtime';
const STORE = 'files';
const PREFIX = '/__deck__/';

// A deck loads only its own (same-origin) assets and must not phone home. It is
// also only ever framed by the OpenDeck shell — frame-ancestors pins that to the
// prod shell origin plus the localhost dev shell, so no other site can embed a
// user's deck even if it learns the (content-addressed) URL.
const DECK_CSP =
  "default-src 'self' blob: data:; img-src 'self' blob: data:; " +
  "media-src 'self' blob: data:; font-src 'self' data:; " +
  "style-src 'self' 'unsafe-inline'; " +
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' blob: data:; " +
  "frame-ancestors https://app.open-deck.org http://localhost:5173 http://127.0.0.1:5173";

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
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function idbGet(db, key) {
  return new Promise((resolve, reject) => {
    const r = db.transaction(STORE).objectStore(STORE).get(key);
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
    const rec = await idbGet(db, `${id}/${path}`);
    if (!rec) return new Response('Not found', { status: 404 });
    return new Response(rec.data, {
      status: 200,
      headers: {
        'Content-Type': rec.mime || 'application/octet-stream',
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        'Content-Security-Policy': DECK_CSP,
      },
    });
  } catch (err) {
    return new Response('Deck store error: ' + err.message, { status: 500 });
  }
}
