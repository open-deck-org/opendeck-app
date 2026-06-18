// Renders a deck inside a sandboxed, cross-origin iframe.
//
// Isolation is the whole point: a deck is untrusted downloaded JS, so it must
// never be able to reach the shell's origin or the Capacitor bridge.
//
//  - Native: deck content is served from the deck:// origin, a DIFFERENT origin
//    than the shell (capacitor://). The iframe gets `allow-same-origin`, which
//    here resolves to the deck:// origin — so the deck has its own storage yet
//    remains cross-origin to the shell and the Capacitor bridge. True isolation.
//  - Web/PWA: the service worker can only intercept requests from a sandboxed
//    iframe if that iframe is same-origin (a SW cannot control an opaque-origin
//    frame). So the web preview shares the shell origin. That's acceptable: the
//    browser build has no native bridge to protect, and the sandbox still blocks
//    top-navigation, popups, and form submission. Strong isolation is a native
//    property (deck://), which is where untrusted decks actually run on device.

import { isNative, platformName } from './platform.js';

// Deck content is served from a DIFFERENT origin than the shell on every
// platform, so untrusted deck JS stays isolated from the Capacitor bridge:
//   ios / macOS (Catalyst): deck://         (WKURLSchemeHandler)
//   android:                https host       (WebView shouldInterceptRequest)
//   web / PWA:              same-origin path  (service worker)
export const ANDROID_DECK_HOST = 'https://decks.opendeck';

export function deckUrl(manifest, sub) {
  const path = sub || manifest.entry || 'index.html';
  const p = platformName();
  if (p === 'android') return `${ANDROID_DECK_HOST}/${manifest.id}/${path}`;
  if (isNative()) return `deck://${manifest.id}/${path}`;   // ios + macOS
  return `${location.origin}/__deck__/${manifest.id}/${path}`;
}

function sandboxAttr() {
  // allow-same-origin is required on web for the service worker to control the
  // frame; on native it resolves to the deck's own origin (deck:// on iOS/macOS,
  // the https deck host on Android), keeping it cross-origin to the shell.
  // Notably absent: allow-top-navigation — the deck cannot replace the shell.
  return ['allow-scripts', 'allow-same-origin', 'allow-popups', 'allow-popups-to-escape-sandbox', 'allow-forms'].join(' ');
}

const el = {
  player: () => document.getElementById('player'),
  stage: () => document.querySelector('.player-stage'),
  title: () => document.getElementById('player-title'),
};

export function openPlayer(manifest) {
  const stage = el.stage();
  stage.replaceChildren();

  const frame = document.createElement('iframe');
  frame.setAttribute('sandbox', sandboxAttr());
  frame.setAttribute('allow', 'fullscreen; autoplay; encrypted-media; gamepad; xr-spatial-tracking');
  frame.referrerPolicy = 'no-referrer';
  frame.title = manifest.title || manifest.id;
  frame.src = deckUrl(manifest);
  stage.appendChild(frame);

  el.title().textContent = manifest.title || manifest.id;   // untrusted -> textContent

  const player = el.player();
  player.classList.add('is-open');
  player.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';

  // Orientation is NOT locked: portrait and landscape are both supported. On
  // rotation the viewport changes (a real `resize`), the deck re-fits itself,
  // and the shell relayouts via CSS + safe-area insets.
}

export function closePlayer() {
  const player = el.player();
  player.classList.remove('is-open');
  player.setAttribute('aria-hidden', 'true');
  el.stage().replaceChildren();
  document.body.style.overflow = '';
}

export function isPlayerOpen() {
  return el.player().classList.contains('is-open');
}
