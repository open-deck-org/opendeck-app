// Package parsing: a .deck/.zip -> { manifest, files: Map<path, Uint8Array> }.
// fflate is vendored into www/vendor/ by the postinstall script and imported
// lazily, so the shell still loads (e.g. to browse bundled samples) even
// before `npm install` has run.

let _fflate = null;
async function fflate() {
  if (!_fflate) {
    try {
      _fflate = await import('../vendor/fflate.js');
    } catch (e) {
      throw new Error('fflate is not vendored yet. Run `npm install` (it runs scripts/vendor.mjs).');
    }
  }
  return _fflate;
}

const MANIFEST_NAME = 'deck.json';

// Normalize a zip entry path: strip leading "./", collapse a single common
// top-level folder (many zips wrap everything in one directory).
function normalizeEntries(raw) {
  const paths = Object.keys(raw).filter((p) => !p.endsWith('/'));
  let prefix = '';
  const tops = new Set(paths.map((p) => p.split('/')[0]));
  if (tops.size === 1 && paths.every((p) => p.includes('/'))) {
    prefix = [...tops][0] + '/';
  }
  const files = new Map();
  for (const p of paths) {
    const clean = (prefix && p.startsWith(prefix) ? p.slice(prefix.length) : p).replace(/^\.\//, '');
    if (clean) files.set(clean, raw[p]);
  }
  return files;
}

// Human-readable display name derived from the filename. NOT used as a storage
// or origin identity (that is the content hash below) — purely a fallback label
// for the library card when a deck omits manifest.title.
function deriveName(filename) {
  const base = (filename || 'deck').replace(/\.(deck|zip)$/i, '').replace(/[^a-z0-9-_ ]+/gi, ' ').trim();
  return base || 'deck';
}

// Content-addressed storage id: a 128-bit SHA-256 of the *normalized file tree*
// (every path + its bytes, order-independent), encoded base36 → a 25-char,
// lowercase, DNS-label-safe and case-insensitive-filesystem-safe string.
//
// Why content-addressed, and why this is a security property:
//   - The folder/origin a deck occupies is decided by ITS OWN bytes, never by
//     an author-supplied manifest.id. So one publisher cannot pick another
//     deck's id to overwrite or partially clobber its files (e.g. ship a fake
//     "v2.0"): different bytes → different id → a separate, isolated folder.
//   - Re-importing identical content yields the same id, so import can dedup
//     instead of duplicating.
// We hash each file individually then hash the concatenation of "path:hash"
// lines, so memory stays bounded regardless of deck size (no giant concat of
// all file bytes).
export async function contentId(files) {
  const enc = new TextEncoder();
  const entries = [...files.entries()].sort((a, b) => (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const lines = [];
  for (const [path, bytes] of entries) {
    const h = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
    lines.push(enc.encode(`${path}:`), h, enc.encode('\n'));
  }
  const total = lines.reduce((n, p) => n + p.length, 0);
  const buf = new Uint8Array(total);
  let off = 0;
  for (const p of lines) { buf.set(p, off); off += p.length; }
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', buf));
  return base36(digest.subarray(0, 16)); // 128 bits → 25 base36 chars
}

function base36(bytes) {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) | BigInt(b);
  return n.toString(36).padStart(25, '0');
}

export async function parsePackage(bytes, filename) {
  const { unzipSync } = await fflate();
  const raw = unzipSync(new Uint8Array(bytes));
  const files = normalizeEntries(raw);

  let manifest = {};
  const manifestBytes = files.get(MANIFEST_NAME);
  if (manifestBytes) {
    try {
      manifest = JSON.parse(new TextDecoder().decode(manifestBytes));
    } catch {
      throw new Error(`Invalid ${MANIFEST_NAME} in package.`);
    }
  }

  // Fill in defaults / validate.
  const entry = manifest.entry || (files.has('index.html') ? 'index.html' : null);
  if (!entry) throw new Error('Package has no deck.json "entry" and no index.html.');
  if (!files.has(entry)) throw new Error(`Manifest entry "${entry}" not found in package.`);

  // Storage + origin identity is the CONTENT HASH, never the author-supplied
  // manifest.id (which is untrusted and could collide with another deck's).
  // manifest.id is kept only as a display hint via the title fallback below.
  const id = await contentId(files);
  const displayName = manifest.title
    || (manifest.id && /^[a-z0-9-_ ]+$/i.test(manifest.id) ? manifest.id : deriveName(filename));

  // Optional preview image, packaged inside the deck and referenced by a
  // relative path. Only keep it if it points at a file that's actually present
  // so the library card never renders a broken <img>.
  const thumbnail = (typeof manifest.thumbnail === 'string' && files.has(manifest.thumbnail))
    ? manifest.thumbnail
    : undefined;

  manifest = {
    schema: manifest.schema || 1,
    id,                         // content hash — the folder/origin identity
    title: displayName,
    entry,
    orientation: manifest.orientation || 'any',
    author: manifest.author || '',
    version: manifest.version || '1.0.0',
    ...(thumbnail ? { thumbnail } : {}),
  };

  return { manifest, files };
}
