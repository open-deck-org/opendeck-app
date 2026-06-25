// A-side client for the dedicated deck origin (B). Web/PWA only.
//
// Manages a hidden iframe pointed at B's bridge.html and exposes a small
// promise-based RPC over postMessage to push deck bytes into B's storage, check
// presence, and delete. The shell store (A) stays canonical; B is a serving
// cache we repopulate on demand (browsers can evict B's storage independently).
// See docs/DECISIONS.md D22.

import { DeckStore } from './store.js';

let frame = null;
let ready = null;            // Promise<void> resolved when B's SW is active
let bOrigin = '';
let seq = 0;
const pending = new Map();   // reqId -> {resolve, reject}

function onMessage(event) {
  if (event.origin !== bOrigin) return;        // only trust B
  const m = event.data || {};
  if (m.type === 'reply' && pending.has(m.reqId)) {
    const { resolve, reject } = pending.get(m.reqId);
    pending.delete(m.reqId);
    if (m.error) reject(new Error(m.error)); else resolve(m);
  }
}

function rpc(msg, transfer) {
  return new Promise((resolve, reject) => {
    const reqId = ++seq;
    pending.set(reqId, { resolve, reject });
    frame.contentWindow.postMessage({ ...msg, reqId }, bOrigin, transfer || []);
    setTimeout(() => {
      if (pending.has(reqId)) { pending.delete(reqId); reject(new Error('deck bridge timeout')); }
    }, 15000);
  });
}

const READY_TIMEOUT = 5000;   // per-attempt wait for B's 'ready' handshake
const MAX_ATTEMPTS = 3;       // self-heal a transient bridge load (e.g. an edge 403)

// Initialize once. `origin` is B's origin (e.g. http://localhost:5174).
export function init(origin) {
  if (ready) return ready;
  bOrigin = new URL(origin).origin;
  window.addEventListener('message', onMessage);
  ready = (async () => {
    let lastErr = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        await loadBridge(attempt);
        return;
      } catch (e) {
        lastErr = e;
        if (e && e.fatal) throw e;   // B reported a real error; retrying won't help
      }
    }
    throw lastErr || new Error('deck runtime did not become ready');
  })();
  return ready;
}

// Load B's bridge into a fresh hidden iframe and wait for its 'ready' handshake.
// Cloudflare's edge can intermittently 403 the cross-site iframe navigation; a
// failed load yields no 'ready' message, so we time out and let init() retry
// with a cache-busting param rather than hanging on a single bad response.
function loadBridge(attempt) {
  return new Promise((resolve, reject) => {
    if (frame) { try { frame.remove(); } catch { /* gone */ } frame = null; }
    const f = document.createElement('iframe');
    f.hidden = true;
    f.setAttribute('aria-hidden', 'true');
    f.style.display = 'none';
    let settled = false;
    const cleanup = () => { window.removeEventListener('message', onReady); clearTimeout(timer); };
    const onReady = (event) => {
      if (event.origin !== bOrigin || settled) return;
      const m = event.data || {};
      if (m.type === 'ready') {
        settled = true; cleanup(); frame = f; resolve();
      } else if (m.type === 'error') {
        settled = true; cleanup();
        try { f.remove(); } catch { /* gone */ }
        const err = new Error(m.error); err.fatal = true; reject(err);
      }
    };
    window.addEventListener('message', onReady);
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true; cleanup();
      try { f.remove(); } catch { /* gone */ }
      reject(new Error('deck runtime did not become ready'));
    }, READY_TIMEOUT);
    // Pass the shell origin so B can pin its message sender to us. From the 2nd
    // try on, a counter cache-busts so the retry gets a fresh fetch.
    const bust = attempt > 1 ? `&try=${attempt}` : '';
    f.src = `${bOrigin}/bridge.html?shell=${encodeURIComponent(location.origin)}${bust}`;
    document.body.appendChild(f);
  });
}

async function has(id) {
  await ready;
  return (await rpc({ type: 'has', id })).present === true;
}

async function put(id, files) {
  await ready;
  // files: Array<[path, Uint8Array, mime]> — structured-cloned to B.
  await rpc({ type: 'put', id, files });
}

// Ensure deck <id> is present in B, pushing its files from the canonical store
// (A) if missing. Cheap when already cached (a single presence check).
export async function ensure(id) {
  await ready;
  if (await has(id)) return;
  const files = await DeckStore.readFiles(id);
  await put(id, files);
}

export async function remove(id) {
  await ready;
  await rpc({ type: 'del', id });
}

export const DeckBridge = { init, ensure, remove, has };
