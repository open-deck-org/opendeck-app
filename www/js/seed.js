// First-run seed: populates the library on a fresh install so it isn't empty.
//
//  - The "welcome" intro ships UNZIPPED under www/samples/welcome/ (a single
//    self-contained index.html), so seeding it needs no fflate and works on web
//    and device (fetch() reads straight from the app bundle).
//  - The showcase decks ship as packaged .deck files under www/samples/ and go
//    through the normal import path (parsePackage → DeckStore.importPackage),
//    exactly as if the user had opened them — they carry their own deck.json and
//    cover thumbnail.
//
// Welcome is seeded LAST so its addedAt is the most recent and it sorts to the
// top of the (recency-ordered) shelf, ahead of the showcases.

import { DeckStore } from './store.js';
import { contentId } from './unzip.js';

const WELCOME_DIR = 'samples/welcome';
const WELCOME_FILES = ['index.html']; // self-contained single-file deck

// Packaged showcase decks bundled with the app (same files served on the site).
const SHOWCASE_DECKS = [
  'samples/how-colour-works.deck',
  'samples/move-a-room.deck',
  'samples/compounding.deck',
];

async function importShowcase(path) {
  const buf = await (await fetch(path)).arrayBuffer();
  const filename = path.split('/').pop();
  await DeckStore.importPackage(new Uint8Array(buf), filename);
}

async function seedWelcome() {
  const meta = await (await fetch(`${WELCOME_DIR}/deck.json`)).json();
  const files = new Map();
  for (const rel of WELCOME_FILES) {
    const buf = await (await fetch(`${WELCOME_DIR}/${rel}`)).arrayBuffer();
    files.set(rel, new Uint8Array(buf));
  }
  // Same content-addressed identity as imported decks (never the deck.json id).
  const manifest = {
    ...meta,
    id: await contentId(files),
    title: meta.title || meta.id || 'Welcome',
  };
  await DeckStore.seedFiles(manifest, files);
}

export async function seedSampleIfEmpty() {
  const existing = await DeckStore.list();
  if (existing.length) return;

  // Showcases first (older), welcome last (newest → top of the shelf). A single
  // failing deck must not abort the rest of the seed.
  for (const path of SHOWCASE_DECKS) {
    try {
      await importShowcase(path);
    } catch (err) {
      console.warn('Showcase seed skipped:', path, err);
    }
  }
  try {
    await seedWelcome();
  } catch (err) {
    console.warn('Welcome seed skipped:', err);
  }
}
