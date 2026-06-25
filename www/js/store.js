// DeckStore: persists imported decks and exposes the library list.
//
//  - Web / PWA: IndexedDB on the SHELL origin (A) is canonical. Unzipped files
//    live in the `files` object store keyed `${id}/${path}`; deckbridge.js then
//    pushes them to the dedicated deck-runtime origin (B), whose own service
//    worker serves `/__deck__/<id>/...`. `readFiles` repopulates B on demand.
//  - Native (iOS/Android/Catalyst): the Capacitor Filesystem plugin writes the
//    unzipped tree under Directory.Library/decks/<id>/...; the native deck://
//    scheme handler (or Android asset loader) reads it straight off disk.
//
// Both backends expose the same async API: list, importPackage, remove.

import { isNative, plugin } from './platform.js';
import { parsePackage } from './unzip.js';
import { mimeFor } from './mime.js';

const INDEX_KEY = 'index';

/* ----------------------------- web backend ----------------------------- */

const DB_NAME = 'opendeck';
const DB_VERSION = 1;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('decks')) db.createObjectStore('decks', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('files')) db.createObjectStore('files');
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function tx(db, stores, mode, fn) {
  return new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    const result = fn(t);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
}

const webBackend = {
  async list() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const out = [];
      const cur = db.transaction('decks').objectStore('decks').openCursor();
      cur.onsuccess = () => {
        const c = cur.result;
        if (c) { out.push(c.value); c.continue(); }
        else resolve(out.sort((a, b) => b.addedAt - a.addedAt));
      };
      cur.onerror = () => reject(cur.error);
    });
  },

  async importPackage(bytes, filename) {
    const { manifest, files } = await parsePackage(bytes, filename);
    const db = await openDB();
    // manifest.id is a content hash, so a hit here means byte-identical content
    // is already stored. Dedup: refresh recency, keep the existing files and any
    // user flags (favorite). Never overwrite — distinct content gets a distinct id.
    const existing = await new Promise((res, rej) => {
      const r = db.transaction('decks').objectStore('decks').get(manifest.id);
      r.onsuccess = () => res(r.result);
      r.onerror = () => rej(r.error);
    });
    if (existing) {
      existing.addedAt = Date.now();
      await tx(db, ['decks'], 'readwrite', (t) => t.objectStore('decks').put(existing));
      return existing;
    }
    await tx(db, ['decks', 'files'], 'readwrite', (t) => {
      const fstore = t.objectStore('files');
      for (const [path, data] of files) {
        fstore.put({ data, mime: mimeFor(path) }, `${manifest.id}/${path}`);
      }
      t.objectStore('decks').put({ ...manifest, addedAt: Date.now() });
    });
    return manifest;
  },

  async seedFiles(manifest, files) {
    const db = await openDB();
    await tx(db, ['decks', 'files'], 'readwrite', (t) => {
      const fstore = t.objectStore('files');
      for (const [path, data] of files) {
        fstore.put({ data, mime: mimeFor(path) }, `${manifest.id}/${path}`);
      }
      t.objectStore('decks').put({ ...manifest, addedAt: Date.now() });
    });
  },

  async remove(id) {
    const db = await openDB();
    await tx(db, ['decks', 'files'], 'readwrite', (t) => {
      t.objectStore('decks').delete(id);
      const fstore = t.objectStore('files');
      const range = IDBKeyRange.bound(`${id}/`, `${id}/￿`);
      fstore.openCursor(range).onsuccess = (e) => {
        const c = e.target.result;
        if (c) { c.delete(); c.continue(); }
      };
    });
  },

  // Read a deck's files back as [path, Uint8Array, mime] — used to (re)populate
  // the dedicated deck origin (B) on web. See deckbridge.js.
  async readFiles(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const out = [];
      const range = IDBKeyRange.bound(`${id}/`, `${id}/￿`);
      const cur = db.transaction('files').objectStore('files').openCursor(range);
      cur.onsuccess = () => {
        const c = cur.result;
        if (c) {
          const path = String(c.key).slice(id.length + 1);
          out.push([path, c.value.data, c.value.mime]);
          c.continue();
        } else {
          resolve(out);
        }
      };
      cur.onerror = () => reject(cur.error);
    });
  },

  // Read a single file's bytes + mime from the SHELL store. Used to render deck
  // cover thumbnails as same-origin blobs: the card <img> can't load from the
  // deck-runtime origin (B's SW only serves the deck's own iframe, not the
  // shell's cross-origin subresource requests), so we draw it from here instead.
  async readFile(id, path) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const r = db.transaction('files').objectStore('files').get(`${id}/${path}`);
      r.onsuccess = () => resolve(r.result || null);   // { data, mime } | null
      r.onerror = () => reject(r.error);
    });
  },

  async touch(id) {
    const db = await openDB();
    await tx(db, ['decks'], 'readwrite', (t) => {
      const store = t.objectStore('decks');
      const req = store.get(id);
      req.onsuccess = () => {
        const rec = req.result;
        if (rec) { rec.lastOpenedAt = Date.now(); store.put(rec); }
      };
    });
  },

  async setFavorite(id, value) {
    const db = await openDB();
    await tx(db, ['decks'], 'readwrite', (t) => {
      const store = t.objectStore('decks');
      const req = store.get(id);
      req.onsuccess = () => {
        const rec = req.result;
        if (rec) { rec.favorite = !!value; store.put(rec); }
      };
    });
  },
};

/* --------------------------- native backend ---------------------------- */

// Directory.Library: app-managed storage. iOS -> Library/, Android -> filesDir/.
// The native deck:// handlers read from this same root (see native/ docs).
const DIR = 'LIBRARY';
const ROOT = 'decks';          // decks/<id>/...

function fsPlugin() {
  const fs = plugin('Filesystem');
  if (!fs) throw new Error('Capacitor Filesystem plugin not available.');
  return fs;
}

function toBase64(u8) {
  let s = '';
  const CHUNK = 0x8000;
  for (let i = 0; i < u8.length; i += CHUNK) {
    s += String.fromCharCode.apply(null, u8.subarray(i, i + CHUNK));
  }
  return btoa(s);
}

async function readIndex(fs) {
  try {
    const res = await fs.readFile({ path: `${ROOT}/${INDEX_KEY}.json`, directory: DIR, encoding: 'utf8' });
    return JSON.parse(res.data);
  } catch {
    return [];
  }
}

async function writeIndex(fs, list) {
  await fs.writeFile({
    path: `${ROOT}/${INDEX_KEY}.json`,
    directory: DIR,
    data: JSON.stringify(list),
    encoding: 'utf8',
    recursive: true,
  });
}

const nativeBackend = {
  async list() {
    const fs = fsPlugin();
    return (await readIndex(fs)).sort((a, b) => b.addedAt - a.addedAt);
  },

  async importPackage(bytes, filename) {
    const fs = fsPlugin();
    const { manifest, files } = await parsePackage(bytes, filename);
    const list = await readIndex(fs);
    // manifest.id is a content hash: a hit means byte-identical content is
    // already on disk. Dedup (refresh recency, keep files + user flags). Never
    // overwrite a folder — distinct content always lands in a distinct id.
    const existing = list.find((d) => d.id === manifest.id);
    if (existing) {
      existing.addedAt = Date.now();
      await writeIndex(fs, list);
      return existing;
    }
    for (const [path, data] of files) {
      await fs.writeFile({
        path: `${ROOT}/${manifest.id}/${path}`,
        directory: DIR,
        data: toBase64(data),   // base64 == binary-safe write
        recursive: true,
      });
    }
    list.push({ ...manifest, addedAt: Date.now() });
    await writeIndex(fs, list);
    return manifest;
  },

  async seedFiles(manifest, files) {
    const fs = fsPlugin();
    for (const [path, data] of files) {
      await fs.writeFile({
        path: `${ROOT}/${manifest.id}/${path}`,
        directory: DIR,
        data: toBase64(data),
        recursive: true,
      });
    }
    const list = (await readIndex(fs)).filter((d) => d.id !== manifest.id);
    list.push({ ...manifest, addedAt: Date.now() });
    await writeIndex(fs, list);
  },

  async remove(id) {
    const fs = fsPlugin();
    try {
      await fs.rmdir({ path: `${ROOT}/${id}`, directory: DIR, recursive: true });
    } catch { /* already gone */ }
    await writeIndex(fs, (await readIndex(fs)).filter((d) => d.id !== id));
  },

  async touch(id) {
    const fs = fsPlugin();
    const list = await readIndex(fs);
    const rec = list.find((d) => d.id === id);
    if (!rec) return;
    rec.lastOpenedAt = Date.now();
    await writeIndex(fs, list);
  },

  async setFavorite(id, value) {
    const fs = fsPlugin();
    const list = await readIndex(fs);
    const rec = list.find((d) => d.id === id);
    if (!rec) return;
    rec.favorite = !!value;
    await writeIndex(fs, list);
  },
};

/* ------------------------------ facade --------------------------------- */

const backend = isNative() ? nativeBackend : webBackend;

export const DeckStore = {
  list: () => backend.list(),
  importPackage: (bytes, filename) => backend.importPackage(bytes, filename),
  seedFiles: (manifest, files) => backend.seedFiles(manifest, files),
  remove: (id) => backend.remove(id),
  touch: (id) => backend.touch(id),
  setFavorite: (id, value) => backend.setFavorite(id, value),
  // Web-only: read a deck's bytes back to repopulate the deck-runtime origin (B).
  readFiles: (id) => backend.readFiles
    ? backend.readFiles(id)
    : Promise.reject(new Error('readFiles is web-only')),
  // Web-only: read one file (e.g. the cover thumbnail) for same-origin rendering.
  readFile: (id, path) => backend.readFile
    ? backend.readFile(id, path)
    : Promise.reject(new Error('readFile is web-only')),
};
