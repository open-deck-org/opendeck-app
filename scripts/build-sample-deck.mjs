// Packages www/samples/welcome/ into dist/welcome.deck so you have a real
// importable package to test the import flow (Files / AirDrop / share sheet).
//
//   npm run build:sample   ->   dist/welcome.deck
//
// A .deck is just a zip whose root contains deck.json + the entry html.

import { readFile, writeFile, mkdir, readdir, stat } from 'node:fs/promises';
import { join, relative, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { zipSync } from 'fflate';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const srcDir = join(root, 'www', 'samples', 'welcome');
const outFile = join(root, 'dist', 'welcome.deck');

async function walk(dir) {
  const entries = await readdir(dir);
  const files = [];
  for (const name of entries) {
    const full = join(dir, name);
    if ((await stat(full)).isDirectory()) files.push(...(await walk(full)));
    else files.push(full);
  }
  return files;
}

const files = await walk(srcDir);
const zipInput = {};
for (const f of files) {
  zipInput[relative(srcDir, f).split('\\').join('/')] = new Uint8Array(await readFile(f));
}

const zipped = zipSync(zipInput, { level: 6 });
await mkdir(dirname(outFile), { recursive: true });
await writeFile(outFile, zipped);
console.log(`[build:sample] ${outFile} (${zipped.length} bytes, ${files.length} files)`);
