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

// Initialize once. `origin` is B's origin (e.g. http://localhost:5174).
export function init(origin) {
  if (ready) return ready;
  bOrigin = new URL(origin).origin;
  window.addEventListener('message', onMessage);
  ready = new Promise((resolve, reject) => {
    frame = document.createElement('iframe');
    frame.hidden = true;
    frame.setAttribute('aria-hidden', 'true');
    frame.style.display = 'none';
    const onReady = (event) => {
      if (event.origin !== bOrigin) return;
      const m = event.data || {};
      if (m.type === 'ready') { window.removeEventListener('message', onReady); resolve(); }
      else if (m.type === 'error') { window.removeEventListener('message', onReady); reject(new Error(m.error)); }
    };
    window.addEventListener('message', onReady);
    // Pass the shell origin so B can pin its message sender to us.
    frame.src = `${bOrigin}/bridge.html?shell=${encodeURIComponent(location.origin)}`;
    document.body.appendChild(frame);
    setTimeout(() => reject(new Error('deck runtime did not become ready')), 15000);
  });
  return ready;
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
