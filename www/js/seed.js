// First-run seed: imports the bundled "welcome" sample into the store so the
// library isn't empty on a fresh install. The sample ships unzipped under
// www/samples/welcome/, so this needs no fflate and works on web and device
// (fetch() reads from the app bundle on native).

import { DeckStore } from './store.js';

const SAMPLE_DIR = 'samples/welcome';
const SAMPLE_FILES = ['index.html']; // self-contained single-file deck

export async function seedSampleIfEmpty() {
  const existing = await DeckStore.list();
  if (existing.length) return;

  try {
    const manifest = await (await fetch(`${SAMPLE_DIR}/deck.json`)).json();
    const files = new Map();
    for (const rel of SAMPLE_FILES) {
      const buf = await (await fetch(`${SAMPLE_DIR}/${rel}`)).arrayBuffer();
      files.set(rel, new Uint8Array(buf));
    }
    await DeckStore.seedFiles(manifest, files);
  } catch (err) {
    console.warn('Sample seed skipped:', err);
  }
}
