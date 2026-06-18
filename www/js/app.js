// Shell controller: theme, the library UI, import flow, native file intents,
// the settings screen, the in-app delete sheet, and the player overlay.

import { isNative, platformName, plugin } from './platform.js';
import { DeckStore } from './store.js';
import { openPlayer, closePlayer, isPlayerOpen, deckUrl } from './player.js';
import { seedSampleIfEmpty } from './seed.js';
import { hydrateIcons, iconSvg } from './icons.js';

const APP_VERSION = '0.1.0';

const $ = (id) => document.getElementById(id);
const grid = $('deck-grid');
const emptyState = $('empty-state');
const importInput = $('import-input');
const toastEl = $('toast');
const libraryBar = $('library-bar');

/* --------------------------------- toast -------------------------------- */

let toastTimer = null;
function toast(msg) {
  $('toast-text').textContent = msg;
  toastEl.classList.add('is-shown');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('is-shown'), 2600);
}

/* --------------------------------- theme -------------------------------- */
// Persisted in localStorage (works in every Capacitor WebView). 'auto' removes
// the attribute so the OS-level prefers-color-scheme drives the tokens.

const root = document.documentElement;
const THEME_KEY = 'opendeck.theme';

function applyTheme(val) {
  if (val === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', val);
  document.querySelectorAll('#theme-control [data-theme-val]').forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.themeVal === val));
  });
}
function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || 'auto');
  document.querySelectorAll('#theme-control [data-theme-val]').forEach((btn) => {
    btn.addEventListener('click', () => {
      localStorage.setItem(THEME_KEY, btn.dataset.themeVal);
      applyTheme(btn.dataset.themeVal);
    });
  });
}

/* ------------------------------- card size ------------------------------ */
// Drives the deck grid's column min-width via the --card-min token. 'medium'
// is the default (today's 180px) so it removes the attribute; small/large
// widen or narrow every card uniformly.

const CARDSIZE_KEY = 'opendeck.cardsize';

function applyCardSize(val) {
  if (val === 'medium') root.removeAttribute('data-cardsize');
  else root.setAttribute('data-cardsize', val);
  document.querySelectorAll('#cardsize-control [data-cardsize-val]').forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.cardsizeVal === val));
  });
}
function initCardSize() {
  applyCardSize(localStorage.getItem(CARDSIZE_KEY) || 'medium');
  document.querySelectorAll('#cardsize-control [data-cardsize-val]').forEach((btn) => {
    btn.addEventListener('click', () => {
      localStorage.setItem(CARDSIZE_KEY, btn.dataset.cardsizeVal);
      applyCardSize(btn.dataset.cardsizeVal);
    });
  });
}

/* ------------------------------ library UI ------------------------------ */

function deckCard(manifest) {
  const id = manifest.id;
  const title = manifest.title || id;          // untrusted -> textContent only
  const version = manifest.version || '1.0';

  const li = document.createElement('li');
  li.className = 'card';
  li.dataset.id = id;

  // Open control (thumbnail)
  const open = document.createElement('button');
  open.type = 'button';
  open.className = 'card__open';
  open.setAttribute('aria-label', `Open ${title}`);

  const thumb = document.createElement('span');
  thumb.className = 'thumb';
  if (manifest.thumbnail) {
    const img = document.createElement('img');
    img.className = 'thumb__img';
    img.loading = 'lazy';
    img.alt = '';
    img.addEventListener('error', () => { img.remove(); addGlyph(thumb, title); });
    img.src = deckUrl(manifest, manifest.thumbnail);
    thumb.appendChild(img);
  } else {
    addGlyph(thumb, title);
  }
  open.appendChild(thumb);

  // Single top-right control, reused: opens the in-app card menu (favorite /
  // delete). When the deck is favorited it rests as a star and swaps to •••
  // on hover/focus; otherwise it's the bare ••• revealed on hover/focus.
  // Icon SVGs are trusted; aria-label text is set separately.
  const menuBtn = document.createElement('button');
  menuBtn.type = 'button';
  menuBtn.className = manifest.favorite ? 'card__menu is-fav' : 'card__menu';
  menuBtn.setAttribute('aria-label', `Actions for ${title}`);
  menuBtn.innerHTML = iconSvg('star-fill', 'icon-sm card__icon-star') +
    iconSvg('more', 'icon-sm card__icon-more');

  // Label
  const label = document.createElement('div');
  label.className = 'card__label';
  const name = document.createElement('p');
  name.className = 'card__title';
  name.textContent = title;
  const sub = document.createElement('p');
  sub.className = 'card__sub';
  sub.textContent = manifest.author ? `v${version} · ${manifest.author}` : `v${version}`;
  label.append(name, sub);

  li.append(open, menuBtn, label);

  const present = () => { DeckStore.touch(id); openPlayer(manifest); };
  open.addEventListener('click', present);
  menuBtn.addEventListener('click', (e) => { e.stopPropagation(); openActions(manifest); });
  li.addEventListener('contextmenu', (e) => { e.preventDefault(); openActions(manifest); }); // desktop right-click
  attachLongPress(open, () => openActions(manifest));                                          // touch long-press

  return li;
}

function addGlyph(thumb, title) {
  const glyph = document.createElement('span');
  glyph.className = 'thumb__glyph';
  glyph.textContent = (title.trim()[0] || '▦').toUpperCase();
  thumb.appendChild(glyph);
}

/* ------------------------------ sort / group ---------------------------- */
// Default "Recent" orders by last-opened (falling back to date-added) and groups
// into Apple's canonical relative-date sections WHEN the decks span 2+ periods;
// if everything sits in one period (e.g. all Today) it stays a flat grid — a
// lone header adds nothing. "Name" is a flat A→Z list. Order only changes on
// refresh (import/delete/launch), never while you're looking at the shelf.

const SORT_KEY = 'opendeck.sort';
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];
let sortMode = localStorage.getItem(SORT_KEY) || 'recent';

const recencyTs = (d) => d.lastOpenedAt || d.addedAt || 0;

function bucketLabel(ts, now) {
  const DAY = 86400000;
  const start = (t) => { const x = new Date(t); x.setHours(0, 0, 0, 0); return x.getTime(); };
  const today0 = start(now);
  const diffDays = Math.round((today0 - start(ts)) / DAY);
  if (diffDays <= 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (ts >= today0 - 7 * DAY) return 'Previous 7 Days';
  if (ts >= today0 - 30 * DAY) return 'Previous 30 Days';
  const d = new Date(ts);
  return d.getFullYear() === new Date(now).getFullYear() ? MONTHS[d.getMonth()] : String(d.getFullYear());
}

function makeGridList(items, label) {
  const ul = document.createElement('ul');
  ul.className = 'grid';
  ul.setAttribute('aria-label', label);
  ul.append(...items.map(deckCard));
  return ul;
}

function applySort(mode) {
  sortMode = mode;
  document.querySelectorAll('#sort-control [data-sort-val]').forEach((b) => {
    b.setAttribute('aria-checked', String(b.dataset.sortVal === mode));
  });
}

function initSort() {
  applySort(sortMode);
  document.querySelectorAll('#sort-control [data-sort-val]').forEach((btn) => {
    btn.addEventListener('click', () => {
      localStorage.setItem(SORT_KEY, btn.dataset.sortVal);
      applySort(btn.dataset.sortVal);
      refresh();
    });
  });
}

// Pinned section headers stick just below the (variable-height) navbar.
function updateNavbarHeightVar() {
  const nav = document.querySelector('.navbar');
  if (nav) document.documentElement.style.setProperty('--navbar-h', `${nav.offsetHeight}px`);
}
window.addEventListener('resize', updateNavbarHeightVar);

async function refresh() {
  const decks = await DeckStore.list();
  const empty = decks.length === 0;

  emptyState.classList.toggle('is-shown', empty);
  emptyState.setAttribute('aria-hidden', String(!empty));
  grid.hidden = empty;
  libraryBar.hidden = decks.length < 2 && sortMode === 'recent';
  if (empty) { grid.replaceChildren(); return; }

  if (sortMode === 'favorites') {
    const favs = decks.filter((d) => d.favorite).sort((a, b) => recencyTs(b) - recencyTs(a));
    if (!favs.length) {
      const note = document.createElement('p');
      note.className = 'deck-empty-note';
      note.textContent = 'No favorites yet. Open a deck’s ··· menu to add one.';
      grid.replaceChildren(note);
    } else {
      grid.replaceChildren(makeGridList(favs, 'Favorite decks'));
    }
  } else if (sortMode === 'name') {
    const sorted = [...decks].sort((a, b) => (a.title || a.id).localeCompare(b.title || b.id));
    grid.replaceChildren(makeGridList(sorted, 'Your decks'));
  } else {
    const sorted = [...decks].sort((a, b) => recencyTs(b) - recencyTs(a));
    const now = Date.now();
    const groups = new Map();                 // insertion order = chronological (sorted desc)
    for (const d of sorted) {
      const label = bucketLabel(recencyTs(d), now);
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(d);
    }
    if (groups.size < 2) {
      grid.replaceChildren(makeGridList(sorted, 'Your decks'));   // one period → stay flat
    } else {
      const sections = [];
      for (const [label, items] of groups) {
        const section = document.createElement('section');
        section.className = 'deck-section';
        const h = document.createElement('h2');
        h.className = 'deck-section__label';
        h.textContent = label;
        section.append(h, makeGridList(items, label));
        sections.push(section);
      }
      grid.replaceChildren(...sections);
    }
  }
  updateNavbarHeightVar();
}

/* long-press helper (touch + mouse) */
function attachLongPress(el, cb) {
  let timer = null;
  const start = () => { timer = setTimeout(cb, 550); };
  const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };
  el.addEventListener('touchstart', start, { passive: true });
  el.addEventListener('touchend', cancel);
  el.addEventListener('touchmove', cancel, { passive: true });
  el.addEventListener('mousedown', start);
  el.addEventListener('mouseup', cancel);
  el.addEventListener('mouseleave', cancel);
}

/* ----------------------- card actions + delete sheet -------------------- */

const sheet = $('confirm-sheet');
const actionsSheet = $('actions-sheet');
const sheetScrim = $('sheet-scrim');
let pendingId = null;
let actionDeck = null;

function openActions(manifest) {
  actionDeck = manifest;
  $('actions-title').textContent = manifest.title || manifest.id;
  const fav = !!manifest.favorite;
  $('action-favorite-icon').innerHTML = iconSvg(fav ? 'star-fill' : 'star', 'icon-sm');
  $('action-favorite-label').textContent = fav ? 'Remove from Favorites' : 'Add to Favorites';
  sheetScrim.classList.add('is-open');
  requestAnimationFrame(() => actionsSheet.classList.add('is-open'));
  $('action-favorite').focus();
}

function askDelete(manifest) {
  pendingId = manifest.id;
  $('confirm-title').textContent = `Delete “${manifest.title || manifest.id}”?`;
  sheetScrim.classList.add('is-open');
  requestAnimationFrame(() => sheet.classList.add('is-open'));
  $('confirm-delete').focus();
}

function closeAllSheets() {
  sheet.classList.remove('is-open');
  actionsSheet.classList.remove('is-open');
  sheetScrim.classList.remove('is-open');
  pendingId = null;
  actionDeck = null;
}

sheetScrim.addEventListener('click', closeAllSheets);
$('action-cancel').addEventListener('click', closeAllSheets);
$('confirm-cancel').addEventListener('click', closeAllSheets);

$('action-favorite').addEventListener('click', async () => {
  const d = actionDeck;
  closeAllSheets();
  if (!d) return;
  const value = !d.favorite;
  await DeckStore.setFavorite(d.id, value);
  toast(value ? 'Added to Favorites' : 'Removed from Favorites');
  await refresh();
});

// Hand off from the actions menu to the destructive confirm (keep the scrim up).
$('action-delete').addEventListener('click', () => {
  const d = actionDeck;
  actionsSheet.classList.remove('is-open');
  actionDeck = null;
  if (d) askDelete(d);
});

$('confirm-delete').addEventListener('click', async () => {
  const id = pendingId;
  if (!id) return;
  closeAllSheets();
  const cardEl = grid.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
  if (cardEl) cardEl.classList.add('is-removing');
  await DeckStore.remove(id);
  toast('Deck removed');
  await refresh();
});

/* ------------------------------- import --------------------------------- */

async function importFromBytes(bytes, filename) {
  try {
    toast('Importing…');
    const manifest = await DeckStore.importPackage(bytes, filename);
    toast(`Added “${manifest.title}”`);
    await refresh();
    return manifest;
  } catch (err) {
    console.error(err);
    toast(`Import failed: ${err.message}`);
  }
}

importInput.addEventListener('change', async () => {
  const file = importInput.files?.[0];
  if (!file) return;
  const bytes = new Uint8Array(await file.arrayBuffer());
  await importFromBytes(bytes, file.name);
  importInput.value = '';
});

// Keyboard activation for the <label> import controls (role=button)
document.querySelectorAll('label[for="import-input"]').forEach((lbl) => {
  lbl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); importInput.click(); }
  });
});

/* ------------------- native file-open / share intents ------------------ */
// The OS hands the app a .deck/.zip (Files, AirDrop, share sheet, email); the
// native layer reads the bytes and exposes them as:
//   window.__OPENDECK_PENDING = { base64, filename, id }
//   window.__opendeckConsumePending?.()     // called by native if defined
// This survives cold launch (global already set) and warm launch (consume fn).
// `id` dedupes repeated injections. See docs/NATIVE-INTEGRATION.md.

let lastImportId = null;

function consumePendingImport() {
  const p = window.__OPENDECK_PENDING;
  if (!p || !p.base64) return;
  if (p.id != null && p.id === lastImportId) return;
  lastImportId = p.id != null ? p.id : null;
  window.__OPENDECK_PENDING = null;

  const bin = atob(p.base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  importFromBytes(bytes, p.filename || 'shared.deck');
}

function wireNativeImport() {
  window.__opendeckConsumePending = consumePendingImport;
  consumePendingImport(); // cold launch: the global may already be set

  const App = plugin('App');
  if (App?.addListener) {
    App.addListener('appUrlOpen', (data) => console.log('appUrlOpen', data?.url));

    // Android hardware/gesture back: step out, layer by layer, then exit.
    App.addListener('backButton', () => {
      if (sheet.classList.contains('is-open') || actionsSheet.classList.contains('is-open')) { closeAllSheets(); return; }
      if (isPlayerOpen()) { closePlayer(); return; }
      if (settingsEl.classList.contains('is-open')) { closeOverlay(settingsEl); return; }
      if (App.exitApp) App.exitApp();
    });
  }
}

/* ------------------------------- settings ------------------------------- */

const settingsEl = $('settings');
function openOverlay(el) { el.classList.add('is-open'); el.setAttribute('aria-hidden', 'false'); document.body.style.overflow = 'hidden'; }
function closeOverlay(el) {
  el.classList.remove('is-open');
  el.setAttribute('aria-hidden', 'true');
  if (!isPlayerOpen()) document.body.style.overflow = '';
}
$('btn-settings').addEventListener('click', () => openOverlay(settingsEl));
$('settings-close').addEventListener('click', () => closeOverlay(settingsEl));

/* -------------------------------- player -------------------------------- */

$('player-close').addEventListener('click', () => closePlayer());

/* ------------------------------- keyboard ------------------------------- */

window.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  if (sheet.classList.contains('is-open') || actionsSheet.classList.contains('is-open')) { closeAllSheets(); return; }
  if (isPlayerOpen()) { closePlayer(); return; }
  if (settingsEl.classList.contains('is-open')) closeOverlay(settingsEl);
});

/* --------------------------- service worker ----------------------------- */
// On web/PWA, the SW serves decks from /__deck__/<id>/... giving them a real
// HTTP origin. Not used on native (the deck:// scheme handler does this job).

async function registerDeckServer() {
  if (isNative() || !('serviceWorker' in navigator)) return;
  try {
    await navigator.serviceWorker.register('sw.js');
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true });
        setTimeout(resolve, 2000); // safety net
      });
    }
  } catch (err) {
    console.warn('Deck service worker failed to register:', err);
    toast('Deck preview needs a service worker (serve over http, not file://).');
  }
}

/* --------------------------------- boot --------------------------------- */

async function boot() {
  root.dataset.platform = platformName();
  hydrateIcons(document);
  $('about-version').textContent = APP_VERSION;
  // Drop the pre-JS anti-flash guards; CSS visibility/opacity controls these now.
  ['player', 'settings', 'actions-sheet', 'confirm-sheet', 'sheet-scrim', 'toast'].forEach((id) => $(id).removeAttribute('hidden'));
  initTheme();
  initCardSize();
  initSort();
  await registerDeckServer();
  wireNativeImport();
  await seedSampleIfEmpty();
  await refresh();
}

boot();
