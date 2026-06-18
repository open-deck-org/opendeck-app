# Architecture

## The problem

Downloaded HTML opens badly on phones — especially iOS, where a `file://` page
gets a null/opaque origin. That breaks relative resource loading, ES modules,
`fetch`/`XHR`, IndexedDB, and service workers, and the Files/Safari UX for
"open this `.html`" is hostile. OpenDeck fixes this by giving deck content a
**real, proper origin** inside a thin native shell.

The win is *not* "more JavaScript power" — the webview JS engine is the same as
the browser's. The win is a correct **security origin** for the content, plus a
clean ingestion + library experience.

## Two origins, always

```
Shell origin          Deck origin
capacitor:// (iOS)    deck://<id>/        (iOS / macOS Catalyst)
https://localhost     https://decks.opendeck/<id>/  (Android)
http://localhost:5173 /__deck__/<id>/     (web, via service worker)
```

The **shell** (deck library, import, player chrome) lives in `www/` and has
access to the Capacitor bridge and native plugins. A **deck** is untrusted,
downloaded code, so it must never touch that bridge. We enforce this with two
layers:

1. **Different origin.** Deck bytes are served from `deck://` / a distinct host
   / a distinct path — never inline in the shell document.
2. **Sandboxed iframe.** The player renders the deck in
   `<iframe sandbox="allow-scripts allow-same-origin allow-popups allow-forms …">`
   (no `allow-top-navigation`, so a deck can never replace the shell).

The strength of isolation differs by platform, because of a hard browser
constraint: **a service worker cannot control a sandboxed iframe that has an
opaque origin** (i.e. one without `allow-same-origin`). So:

| | Deck origin | vs. shell origin | Isolation |
|---|---|---|---|
| **Native** (iOS/macOS/Android) | `deck://<id>` / distinct host | different | **full** — deck is cross-origin, cannot reach `Capacitor.Plugins`, the shell DOM, or `window.parent` |
| **Web/PWA** | same origin, `/__deck__/<id>` path | same | partial — the SW must control the frame, so it's same-origin; the deck *could* read the shell DOM, but there is **no native bridge in a browser**, so nothing sensitive is exposed |

The design point: untrusted decks only ever run with bridge access **on
device**, and there the deck:// origin gives true cross-origin isolation. The
web build is a developer/preview surface where the weaker boundary is harmless.

## Data flow

```
import (file picker / share intent)
        │  bytes + filename
        ▼
  unzip.js  ──parsePackage──►  { manifest, files: Map<path, bytes> }
        │
        ▼
  store.js  (DeckStore)
        ├─ web:    IndexedDB  (decks + files object stores)
        └─ native: Filesystem (Directory.Data/decks/<id>/… + index.json)
        │
present │  manifest
        ▼
  player.js ── deckUrl() ──►  <iframe src="deck://<id>/<entry>">
        │
        ▼
  served by:  WKURLSchemeHandler (iOS/macOS) · WebViewClient intercept
              (Android) · service worker (web)  — all read back from the store
```

`store.js` picks its backend from `isNative()`. Both backends expose the same
API (`list`, `importPackage`, `seedFiles`, `remove`), so the shell UI is
platform-agnostic.

## Why bundler-free

`www/` is plain ES modules with no build step. On device, Capacitor injects
`window.Capacitor` and registers native plugins under
`window.Capacitor.Plugins.*`, so we call the Filesystem/App plugins directly off
the bridge global — no `import '@capacitor/...'` and therefore no bundler. The
only third-party browser dependency is **fflate** (unzip), vendored into
`www/vendor/` by `scripts/vendor.mjs` at install time so it works offline on
device. Add Vite later if the shell grows; nothing here depends on its absence.

## Platform matrix

| Platform | Shell webview | Deck server | Native? | Code reuse |
|----------|---------------|-------------|---------|------------|
| iOS | WKWebView (capacitor://) | `DeckSchemeHandler` (deck://) | yes | — |
| macOS | WKWebView via Catalyst | same handler | yes | reuses iOS |
| Android | WebView (https://localhost) | `DeckWebViewClient` intercept | yes | — |
| Web / PWA | browser | `sw.js` | no | dev + fallback |

## Security model summary

- Deck code runs in a sandboxed, cross-origin iframe — no bridge access.
- Native handlers enforce a **path-traversal guard** (never serve outside
  `decks/<id>/`).
- Native handlers send a restrictive **CSP** (`default-src 'self' deck: …`) so a
  deck can load its own assets but cannot exfiltrate to the network. Loosen
  `connect-src` only if you intentionally allow online decks.
- The shell validates the manifest and renders all untrusted strings via
  `textContent` (never `innerHTML`).

## Player controls (mobile)

Because the deck is a **cross-origin iframe**, the shell cannot inject input
into it or observe its gestures — the only shell→deck channel is `postMessage`.
So control responsibility is split in two, and the shell never listens for
gestures across the deck surface:

- **Deck surface (iframe)** owns *slide* navigation — its own tap-zones,
  horizontal swipe, and keys. The shell adds **no** horizontal gestures (that
  would double-advance and collide with iOS's left-edge back-swipe).
- **Shell chrome** owns *app* navigation via a permanent **slim top bar** —
  `‹ Library` · title · `⤢` (immersive). The bar reserves a strip at the top and
  the stage is inset below it by a **constant** amount that does *not* change in
  immersive (immersive only hides the bar). This is deliberate, for two reasons:
  (1) the iframe never resizes on toggle — WKWebView doesn't reliably fire
  `resize` inside an iframe when the iframe *element* is resized, so a bar that
  pushed the deck would leave it mis-scaled/vertically offset; (2) a deck's own
  top content (e.g. its thumbnail rail) starts *below* our bar instead of being
  overlapped by it. Targets are ≥48dp / ≥44pt and safe-area-inset aware (incl.
  side insets for landscape notches).

**Orientation:** not locked — portrait and landscape are both supported. On
rotation the viewport changes, the deck re-fits, and the shell relayouts via
flexbox + safe-area insets. The deck engine uses a `ResizeObserver` (not just
`window.resize`) so it re-fits reliably even where WebKit skips the resize
event; `manifest.orientation` is a hint, not a hard lock.

**Immersive** (`⤢`) hides the bar for a distraction-free view but keeps a faint,
always-reachable `⌄` reveal control — the user is **never trapped** (an App
Store/Play requirement). Exit paths:

- `‹ Library` → back to the library.
- `⌄` → restore the bar (then `‹`).
- **Android hardware/gesture back** (`App.backButton`): immersive → restore bar;
  else → library; at the library → exit the app. (iOS has no system back button.)
- `Esc` (desktop/Catalyst): leave immersive, else close.

This is the "always-visible slim bar" model — safest for review and free of
gesture/coupling conflicts. A richer model (shell-drawn `‹ ›` arrows + a unified
progress bar) is possible later via a small `postMessage` nav protocol that the
spiel-deck engine would implement.

## Known gaps / next steps

- **Android edge gestures:** on Android 10+ the left/right screen edges are the
  system back-gesture zone, which can swallow edge-initiated deck swipes. Reserve
  them with `View.setSystemGestureExclusionRects` on the bridge WebView (native
  follow-up; mid-screen swipes and taps already work).
- **Thumbnails:** author-provided `manifest.thumbnail` images render on cards;
  decks without one fall back to a placeholder glyph. Auto-capturing a first-slide
  snapshot for thumbnail-less decks is still open.
- **Native file intent:** `DeckBridge`/manifest snippets wire it; the iOS scene
  delegate hook is documented but you must add it to your generated project.
- **Large decks:** base64 Filesystem writes are simple but copy-heavy; switch to
  streaming/zip-on-disk if decks get large.
- **App Store review:** frame decks as documents, not an app platform — see
  NATIVE-INTEGRATION.md.
