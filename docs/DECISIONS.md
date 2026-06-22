# Decision log

The *why* behind OpenDeck's key technical and design choices — the context and
rationale that isn't visible in the code. Lightweight ADR style; newest concerns
grouped by theme. For *how it works* see [ARCHITECTURE.md](ARCHITECTURE.md), for
*how to build* see [BUILDING.md](BUILDING.md).

---

## Product & platform

### D1 — A generic *player*, not one app per deck
Install OpenDeck once; open any number of `.deck` packages in it (like a PDF
viewer), rather than wrapping each presentation as its own app.
- **Why:** matches the packaging model, far better UX, one thing to maintain.
- **Trade-off:** the app must ingest *untrusted* decks at runtime → drives the
  isolation work (D5–D7) and the App Store framing (D15).

### D2 — Capacitor for the shell; **Windows dropped**
Targets: iOS, Android, macOS (Catalyst), Web. No Windows.
- **Why:** Capacitor gives one web shell across mobile + web with a thin native
  bridge. The problem we solve — phones mishandling downloaded local HTML —
  *doesn't exist on desktop browsers*, so a Windows app would solve nothing the
  browser doesn't. macOS is worth it only because Catalyst is nearly free (D14).
- **Alternatives:** Electron (heavy, Chromium per app), Tauri (would mean leaving
  Capacitor), fully native ×3 (most code). Capacitor won on reuse.

### D3 — Bundler-free web shell
`www/` is plain ES modules, no build step. Native plugins are reached via the
`window.Capacitor.Plugins.*` bridge globals, not `import '@capacitor/...'`.
- **Why:** zero toolchain for the shell; the only third-party browser dep is
  fflate, vendored into `www/vendor/` at install. Keeps the shell trivially
  serveable (`npm run dev`) and inspectable.
- **Revisit if:** the shell UI grows — add Vite then; nothing depends on its
  absence.

---

## Deck rendering & isolation

### D4 — Decks render in a **cross-origin sandboxed iframe**
The deck is untrusted downloaded JS. It runs in an `<iframe sandbox>` whose
content comes from a *different origin* than the shell.
- **Why:** the deck can present freely but cannot reach the shell DOM,
  `window.parent`, or `Capacitor.Plugins`. `allow-top-navigation` is withheld so
  it can't replace the shell.

### D5 — Per-platform deck origin (the core fix)
iOS/macOS `deck://`, Android `https://decks.opendeck/`, Web `/__deck__/`.
- **Why:** the actual problem with downloaded HTML on phones isn't "JS is
  weak" — it's that `file://` gives a null origin, breaking relative URLs, ES
  modules, `fetch`, etc. Serving each deck from a real origin fixes that *and*
  gives the isolation boundary in D4. Same idea, three native mechanisms:
  `WKURLSchemeHandler` (iOS/macOS), `WebView.shouldInterceptRequest` (Android),
  a service worker (web).

### D6 — Android uses an **https host**, not a `deck://` scheme
*(Host scheme still https; the single shared host was later split per-deck — see D21.)*
- **Why:** Android WebView is inconsistent about routing *custom-scheme* iframe
  navigations through `shouldInterceptRequest`; a real https host (never resolved —
  always intercepted) is reliable and is a distinct origin from the shell
  (`https://localhost`). iOS has no such issue, so it keeps the cleaner `deck://`.

### D7 — `allow-same-origin` is always set; isolation strength differs by platform
*(Web boundary later hardened and then moved to a dedicated origin — see D22.)*
- **Why:** a service worker **cannot control an opaque-origin iframe**, so on web
  the deck frame must be same-origin *to whatever origin its SW lives on* for the
  SW to serve it. On native the same flag resolves to the deck's *own*
  (cross-origin) origin → real isolation.
- **Consequence:** historically the web preview shared the **shell** origin
  (weaker). D22 moves deck serving to a separate origin so the frame is
  same-origin to *that* origin and cross-origin to the shell.

### D8 — Native handlers enforce a path-traversal guard + restrictive CSP
*(Guard + CSP later tightened — see D21.)*
- **Why:** never serve outside `decks/<id>/`; `connect-src` is locked so a deck
  can load its own bundled assets but can't exfiltrate to the network.

### D20 — Deck identity is a **content hash**, not the author's `manifest.id`
A deck's storage folder and origin id are a 128-bit SHA-256 of its normalized
file tree, base36-encoded to a 25-char string (`unzip.js → contentId`).
- **Why:** `manifest.id` is untrusted. If it decided the folder, one publisher
  could ship a fake "v2.0" with another deck's id and **overwrite / partially
  clobber** it. Content addressing makes identity a function of the bytes:
  different content → different id → a separate, isolated folder. Import is
  create-if-absent; byte-identical re-import **dedups** (refresh recency only).
- **Why base36 (not hex or base62):** the id doubles as a DNS subdomain label
  (Android, D21) and a folder name on case-insensitive APFS (iOS); base62's mixed
  case would collapse and collide, hex is longer. base36 is short *and*
  case-insensitive-safe. `manifest.id` survives only as a display-name fallback.

### D21 — **One origin per deck** on native (deck↔deck isolation) + handler hardening
Android moved from one shared `https://decks.opendeck/<id>/` host to a per-deck
subdomain `https://<id>.decks.opendeck/`; iOS already had per-deck `deck://<id>`.
- **Why:** a single shared host made *all* decks the same origin, so a deck could
  read every other deck's `localStorage`/IndexedDB and `fetch()` their files. A
  distinct host per deck (the content-hash id, D20) makes each deck its own
  origin — isolated from the shell *and* from sibling decks.
- **Hardening shipped with it:** CSP dropped the scheme-wide `deck:` token (now
  `'self'`-only, so a deck can't even address a sibling); handlers send **no
  `Access-Control-Allow-Origin`** (sibling origins can't read via `fetch`); the
  path-traversal guard uses a trailing separator so `…/a` can't prefix-match
  `…/ab`; the Android handler gained the CSP it was previously missing.

### D22 — Web/PWA: a **dedicated deck origin** (B); per-deck subdomains (C) deferred
On web a SW can't control an opaque-origin frame, so decks can't be made
cross-origin *for free* from one static origin. We host a second origin:
- **A = shell** (`localhost:5173` dev): library UI, import, canonical store.
- **B = deck runtime** (`localhost:5174` dev / a `decks.` subdomain in prod): a
  tiny static site — a bootstrap/bridge page + a SW that serves `/__deck__/<id>/`
  from **B's** IndexedDB. The player loads `https://B/__deck__/…` so the deck
  frame is **cross-origin to the shell** (can't reach the shell DOM, the library
  store, or `window.parent`). Bytes cross A→B once via `postMessage` (A stays
  canonical; B is a serving cache repopulated on demand, robust to eviction).
- **Step 0 (already shipped, D-prior):** before B, the SW got a no-remote CSP and
  the sandbox lost `allow-popups-to-escape-sandbox`, so even same-origin web decks
  couldn't *exfiltrate* and couldn't spawn a privileged popup.
- **C (per-deck subdomain `<id>.decks…`) deferred:** would isolate decks from each
  other on web too, but needs wildcard DNS + wildcard TLS + a SW per deck, and a
  rough dev story (`*.localhost` unsupported on Safari). Low marginal value once B
  protects the shell/library — revisit only for a real deck-holds-secrets threat.
- **Native is unaffected** — it already has per-deck origins (D21); B/C only close
  the browser gap.

---

## Packaging & storage

### D9 — `.deck` = a zip of `deck.json` + a self-contained `index.html`
The skill's existing "standalone HTML" export becomes the deck's single
`index.html`; a generated `deck.json` manifest sits beside it.
- **Why:** reuses a solved problem (the spiel-deck bundler already inlines
  scripts/audio/fonts into one offline file). The player just unzips and serves.
- **Implementation:** the skill ships a **zero-dependency store-only zip writer**
  (no compression) so authoring stays build-free; the player unzips with fflate.

### D10 — Storage via Capacitor `Directory.Library`
iOS → `Library/decks/<id>/…`, Android → `filesDir/decks/<id>/…`.
- **Why:** app-managed data, not user-facing Documents (keeps decks out of the
  Files app / iCloud Documents). The native deck servers read this exact path —
  **the JS storage dir and the native read path are a contract; change them
  together.**

### D11 — File-import contract: a polled global, not a one-shot event
Native sets `window.__OPENDECK_PENDING = {base64, filename, id}` and calls
`window.__opendeckConsumePending()`; the shell consumes it, **deduped by `id`**.
Native **polls** for the consumer to exist, then injects **once**.
- **Why:** a `CustomEvent` dispatched before the page's listener exists (cold
  launch by file) is lost. A persistent global survives that. Polling-then-
  injecting-once avoids re-sending a multi-MB base64 payload repeatedly; the
  `id` makes any retry idempotent.

---

## UX & controls

### D12 — Slide nav belongs to the **deck**, app nav to the **shell**
Deck owns tap-zones + horizontal swipe + keys; the shell adds **no** horizontal
gestures.
- **Why:** the cross-origin iframe means the shell can't inject input or read
  gestures anyway (only `postMessage`). Two layers handling swipe would
  double-advance, and a shell edge-swipe would collide with iOS's left-edge
  back-gesture. One owner per axis.

### D13 — Control model: **always-visible slim bar** (+ immersive toggle)
Permanent top bar (`‹ Library` · title · `⤢`) in a reserved strip above the
stage (see D19); `⤢` hides it for an immersive view, leaving a faint `⌄` reveal
in the **same top-right spot** so the toggle reads as staying in place. Chosen
over auto-hide and tap-to-toggle.
- **Why:** simplest and safest for store review — the user is **never trapped**
  (an explicit, always-reachable exit), no overlap with the deck surface, and no
  deck↔shell coupling. Tap-to-toggle would have disabled the deck's own tap-nav
  and required a `postMessage` nav protocol.
- **Compliance details:** targets ≥48dp/44pt, safe-area insets on all edges
  (side notches in landscape), **Android hardware back** wired (immersive →
  reveal → library → exit) so back never closes the app mid-deck.
- **Future:** a richer model (shell-drawn `‹ ›` + unified progress) is possible
  later via a small `postMessage` protocol the spiel-deck engine implements.

---

## Native integration & build

### D14 — macOS via **Mac Catalyst**, not Electron
- **Why:** reuses the iOS target, the `deck://` handler, and all storage code
  with ~zero extra code; produces a genuinely native, small Mac app. Electron
  would be a second runtime to wire and a ~150 MB Chromium bundle.
- **Local run:** ad-hoc signing (`CODE_SIGN_IDENTITY="-"`) runs on the build Mac
  without an Apple account; automatic signing needs the Apple ID in Xcode.

### D15 — App Store framing: decks are **documents**
`CFBundleDocumentTypes` + a custom UTI; no in-app store, no remote shell-update,
restrictive deck CSP; export-compliance + productivity category keys.
- **Why:** keeps clear of iOS guidelines **2.5.2** (no downloaded code that
  changes the app) and **4.7** (HTML5 mini-apps) by presenting the app as a
  viewer of documents the user already has.

### D16 — iOS target wired by a script (`scripts/configure-ios.rb`)
Uses the `xcodeproj` gem (ships with CocoaPods) to register the Swift files,
enable Catalyst, and optionally set signing.
- **Why:** hand-editing `project.pbxproj` is fragile. **Must be re-run after any
  fresh `cap add ios`**, which regenerates the project.

### D17 — `compileSdkVersion` pinned to 36 (environment workaround)
- **Why:** this machine's SDK has an `android-34` platform-metadata parse bug
  with the bundled AGP. 36 builds cleanly; `targetSdk` stays 34. Revert to
  Capacitor's default (34) on an SDK with a parseable `android-34`. *(Env-
  specific, not a product decision — recorded so it isn't mistaken for one.)*

### D18 — Collected outputs in `dist/`
`npm run dist:collect` gathers the latest per-platform artifact into
`dist/{ios,macos,android}/` + the sample `.deck`.
- **Why:** one obvious, consistent place for build outputs (the analogue of
  Gradle's `app/build/outputs`); git-ignored binaries, with a tracked README.

---

### D19 — Constant-inset bar + don't lock orientation (WKWebView resize quirk)
The slim bar reserves a top strip; the stage is inset below it by a **constant**
amount that does NOT change in immersive (immersive only hides the bar, the
iframe size is unchanged). Orientation is **not locked**.
- **Why (constant inset):** WKWebView doesn't reliably fire `resize` *inside* an
  iframe when the iframe **element** is resized. If the bar took/freed a layout
  row on toggle, the iframe resized → the deck never re-fit → its content sat
  vertically offset. Reproduced: the offset showed in the macOS (Catalyst/
  WKWebView) app but **not** in Chromium, confirming the diagnosis. Keeping the
  inset constant means the iframe never resizes on toggle, so the deck stays put
  — works for already-baked decks (no re-export). A first attempt *overlaid* the
  bar (also constant-size), but that overlapped decks whose own content (e.g. a
  thumbnail rail) starts at the top; reserving a strip instead avoids the clash.
- **Why (no lock):** portrait + landscape should both work with auto-relayout on
  rotation. Rotation is a real viewport change, so the deck re-fits and the shell
  reflows (flexbox + safe-area insets).
- **Engine hardening (skill):** `deck-stage.js` now also re-fits via a
  `ResizeObserver` on its `position:fixed` host, which fires reliably in WebKit
  even when `window.resize` doesn't — robust for in-app rotation. *Benefits decks
  re-exported with the updated engine; the overlay fix already covers the
  immersive case for existing decks.*

## Status of open items
- Android edge-gesture exclusion (`setSystemGestureExclusionRects`) — not yet
  done; needs native code + a device to test.
- Thumbnails (first-slide snapshots), large-deck streaming writes — see
  ARCHITECTURE.md → *Known gaps*.
- Styling/colors — intentionally deferred; current chrome is placeholder.
