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

function deriveId(filename, files) {
  const base = (filename || 'deck').replace(/\.(deck|zip)$/i, '').replace(/[^a-z0-9-_]+/gi, '-').toLowerCase();
  // Add a short content-length-based suffix so re-imports of edited decks differ.
  let total = 0;
  for (const v of files.values()) total += v.length;
  return `${base || 'deck'}-${total.toString(36)}`;
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

  const id = (manifest.id && /^[a-z0-9-_]+$/i.test(manifest.id)) ? manifest.id : deriveId(filename, files);

  // Optional preview image, packaged inside the deck and referenced by a
  // relative path. Only keep it if it points at a file that's actually present
  // so the library card never renders a broken <img>.
  const thumbnail = (typeof manifest.thumbnail === 'string' && files.has(manifest.thumbnail))
    ? manifest.thumbnail
    : undefined;

  manifest = {
    schema: manifest.schema || 1,
    id,
    title: manifest.title || id,
    entry,
    orientation: manifest.orientation || 'any',
    author: manifest.author || '',
    version: manifest.version || '1.0.0',
    ...(thumbnail ? { thumbnail } : {}),
  };

  return { manifest, files };
}
