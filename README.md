# OpenDeck

A generic player for HTML presentations on **iOS, Android, and macOS** (Mac
Catalyst). Install the app once; open any number of `.deck` / `.zip`
presentation packages in it. Each deck runs in a real web origin — with the
relative-resource, ES-module, `fetch`, and service-worker behavior that
breaks when you open downloaded HTML straight from `file://` on a phone.

- **App ID:** `org.opendeck`
- **Deck content origin:** `deck://` (iOS/macOS) · intercepted host (Android) · service worker (web)
- **Package extensions:** `.deck` (owned, strong association) · `.zip` (shared)
- **Shell:** bundler-free HTML/CSS/JS in [`www/`](www), wrapped by Capacitor

> Windows is intentionally out of scope — desktop browsers open local HTML fine,
> so the problem OpenDeck solves doesn't exist there.

## Quick start (web shell, no native toolchain)

```bash
npm install          # postinstall vendors fflate (www/vendor/) + fonts (www/fonts/)
npm run dev          # serves www/ at http://localhost:5173
```

Open the URL. You'll see the bundled **Welcome** deck (seeded on first run).
Tap it to present; use **Import deck** to add your own `.deck`/`.zip`. Build a
real package to test importing:

```bash
npm run build:sample # -> dist/welcome.deck  (drag into the Import dialog)
```

The web path uses a **service worker** to serve decks from `/__deck__/<id>/…`,
so it must be served over http (the `npm run dev` server) — not opened as a
`file://` page.

## Add the native apps

```bash
npm run add:ios       # cap add ios   + sync   (needs Xcode)
npm run add:android   # cap add android + sync (needs Android Studio + JDK)
```

Per-platform build & run commands (iOS simulator, Mac Catalyst local run, Android
APK) plus the environment gotchas we hit live in
**[docs/BUILDING.md](docs/BUILDING.md)**. What the native layer does and how it
was wired: **[docs/NATIVE-INTEGRATION.md](docs/NATIVE-INTEGRATION.md)**.

For macOS: open the iOS project in Xcode and enable the **Mac (Designed for
iPad / Catalyst)** destination — it reuses the same `deck://` handler.

## How it works

```
┌─────────────────────────── Shell (Capacitor webview) ────────────────────────┐
│  www/  library UI · import · player overlay   origin: capacitor:// / https    │
│                                                                               │
│   imports .deck ──► unzip (fflate) ──► DeckStore ──► Filesystem / IndexedDB    │
│                                                                               │
│   present ──► <iframe sandbox> ◄── deck:// (native) / SW (web)  [other origin] │
└───────────────────────────────────────────────────────────────────────────────┘
```

The deck always renders in a **sandboxed, cross-origin iframe**, so untrusted
deck JavaScript can never reach the shell origin or the Capacitor native
bridge. See **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** for the full
rationale and the security model.

## Deck package format

A `.deck` is a zip with a `deck.json` manifest at its root. See
**[docs/DECK-FORMAT.md](docs/DECK-FORMAT.md)**. Minimal example: a single
`index.html` + `deck.json` (that's exactly `www/samples/welcome/`).

## Project layout

```
www/                 bundler-free web shell (the app UI; "Zen / Paper" design)
  js/                platform · store · unzip · player · seed · icons · app
  fonts/             bundled Inter + Newsreader (OFL; vendored by postinstall)
  sw.js              web/PWA deck server (serves /__deck__/<id>/…)
  samples/welcome/   bundled sample deck (seeded on first run)
native/ios/          DeckSchemeHandler.swift, DeckBridge.swift, Info.plist snippet
native/android/      DeckAssetLoader.kt, AndroidManifest snippet
scripts/             vendor fflate + fonts · build sample .deck
docs/                design · app-store notes · building · architecture · decisions · native · deck format
  assets/            app-icon masters (opendeck-icon.svg + foreground)
capacitor.config.ts  appId / scheme config
```

## Documentation

- **[docs/DESIGN.md](docs/DESIGN.md)** — the "Zen / Paper" design system; tokens, theming (light/dark/auto), screens, accessibility.
- **[docs/APP-STORE-REVIEW-NOTES.md](docs/APP-STORE-REVIEW-NOTES.md)** — HIG/App-Review compliance, the 2.5.2 framing, privacy label, layered app icon.
- **[docs/BUILDING.md](docs/BUILDING.md)** — build & run each platform; environment gotchas.
- **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)** — how it works; security/isolation; player controls.
- **[docs/DECISIONS.md](docs/DECISIONS.md)** — the *why* behind the key technical & design choices.
- **[docs/NATIVE-INTEGRATION.md](docs/NATIVE-INTEGRATION.md)** — what's wired in `ios/`/`android/` and how to reproduce.
- **[docs/DECK-FORMAT.md](docs/DECK-FORMAT.md)** — the `.deck` package spec.

## Status

All three platforms are wired and the web shell runs and presents decks today.

| Platform | Wired | Built & verified |
|----------|-------|------------------|
| Web / PWA | ✅ | ✅ shell + present + import (browser) |
| iOS | ✅ | ✅ builds + runs in simulator (library seeds + renders) |
| macOS (Catalyst) | ✅ | ✅ builds + **runs** as a native Mac app |
| Android | ✅ | ✅ debug **APK** builds (compileSdk 36) |

The native deck-content servers (`deck://` on iOS/macOS, an intercepted https
host on Android), file-type association, and file-import flow are live in
`ios/` and `android/`. See [docs/NATIVE-INTEGRATION.md](docs/NATIVE-INTEGRATION.md)
for exactly what was wired, how to reproduce it after a clean `cap add`, and the
remaining on-device verification checklist.

Authoring: the **spiel-deck** skill exports a `.deck` directly
(`deckExport.deck()` or "export as a .deck presentation").

## Open source, official builds, and the `.deck` format

OpenDeck is open source under the [Apache License 2.0](./LICENSE). You can build
it, modify it, and ship products on it — including commercially — for free.

**The app is free and always will be.** No paid tiers, no in-app purchases.

**Who publishes the official app.** The OpenDeck apps in the app stores are
built, signed, and published by Sinisha Djukic. This repository is the complete
source for that build — the only things kept out of it are the code-signing
keys, store credentials, and branded assets (name and icon). Being the sole
publisher of the *official* build is the only thing reserved; the code itself
gives that build no advantage over one you compile yourself.

**You can build your own player.** Fork this, or write a brand-new viewer from
scratch — we actively want alternative players. The one rule: a build you ship
to end users must use its own name and icon, not "OpenDeck." See
[TRADEMARKS.md](./TRADEMARKS.md).

**The `.deck` format is an open standard.** The format that OpenDeck reads and
writes is specified separately, under a CC0 public-domain dedication, in its own
repository: **[the `.deck` spec](https://github.com/open-deck-org/opendeck-spec)**. Anyone may
implement it — producers, players, libraries in any language — with no
permission and no attribution required. If you build something on it,
[tell us](https://github.com/open-deck-org/opendeck-app/issues) and we'll link to it.

**Contributing.** See [CONTRIBUTING.md](./CONTRIBUTING.md). We use a lightweight
DCO sign-off (`git commit -s`) rather than a CLA — you keep ownership of your
work.

## License

OpenDeck is released under the [Apache License 2.0](LICENSE). The bundled typefaces —
**Inter** and **Newsreader** (in `www/fonts/`) — are licensed under the SIL Open
Font License 1.1 and are redistributed under its terms.
