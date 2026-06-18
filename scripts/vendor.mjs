// Vendors the offline assets the bundler-free shell needs, so a fresh clone is
// self-contained after `npm install`. Runs automatically via npm "postinstall".
//
//  1. fflate's browser ESM build  -> www/vendor/fflate.js   (from node_modules)
//  2. Inter + Newsreader woff2    -> www/fonts/*.woff2       (downloaded once)
//
// Both steps are idempotent: existing files are left alone, missing ones are
// (re)created. Icons are committed source (www/js/icons.js) — nothing to vendor.

import { copyFile, mkdir, access, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const exists = (p) => access(p).then(() => true).catch(() => false);

/* ------------------------------- 1. fflate ------------------------------ */

const fflateSrc = join(root, 'node_modules', 'fflate', 'esm', 'browser.js');
const fflateDest = join(root, 'www', 'vendor', 'fflate.js');

if (await exists(fflateSrc)) {
  await mkdir(dirname(fflateDest), { recursive: true });
  await copyFile(fflateSrc, fflateDest);
  console.log('[vendor] fflate -> www/vendor/fflate.js');
} else {
  console.warn('[vendor] fflate not found in node_modules — skipping (run `npm install`).');
}

/* -------------------------------- 2. fonts ------------------------------ */
// Latin variable subsets (one file each), pinned to the Google Fonts versions
// the design was built against. Committed to the repo too; this only re-fetches
// if a file is absent (e.g. a clone that gitignores binaries).

const FONT_DIR = join(root, 'www', 'fonts');
const FONTS = [
  ['inter-latin.woff2',            'https://fonts.gstatic.com/s/inter/v20/UcC73FwrK3iLTeHuS_nVMrMxCp50SjIa1ZL7W0Q5nw.woff2'],
  ['newsreader-latin.woff2',       'https://fonts.gstatic.com/s/newsreader/v26/cY9AfjOCX1hbuyalUrK4397yjIJFJpc.woff2'],
  ['newsreader-italic-latin.woff2','https://fonts.gstatic.com/s/newsreader/v26/cY9XfjOCX1hbuyalUrK439vogqCz_goCYw7oRYCJFYYzbARA_n8.woff2'],
];

await mkdir(FONT_DIR, { recursive: true });
for (const [name, url] of FONTS) {
  const dest = join(FONT_DIR, name);
  if (await exists(dest)) { console.log(`[vendor] font present -> www/fonts/${name}`); continue; }
  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15' } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await writeFile(dest, Buffer.from(await res.arrayBuffer()));
    console.log(`[vendor] font -> www/fonts/${name}`);
  } catch (err) {
    console.warn(`[vendor] could not fetch ${name} (${err.message}). The app falls back to system fonts (-apple-system / ui-serif).`);
  }
}
