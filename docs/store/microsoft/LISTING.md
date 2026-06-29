# Microsoft Store Listing — paste-ready metadata

Everything to fill the Partner Center listing for **OpenDeck** on Windows (PWA via
PWABuilder → MSIX). Copy the fields straight in. Mirrors `docs/store/apple/LISTING.md`;
the submission *checklist* lives outside the repo
(`opendeck-app-microsoft-store-checklist.md`).

> URLs (live):
> - Privacy Policy: `https://open-deck.org/privacy/`
> - Support: `https://open-deck.org/support/`
> - Website: `https://open-deck.org/`
> - App origin (the MSIX is pinned to this): `https://app.open-deck.org`

---

## Core fields

| Field | Value |
|---|---|
| **Product name** | `OpenDeck` |
| **Short title** (≤50) | `OpenDeck` |
| **Voice title** (≤255) | `Open Deck` _(spoken-friendly: two words so voice launch says "open deck")_ |
| **Category** | Productivity |
| **Price** | Free |
| **Markets** | All |
| **Copyright** (≤200) | `© 2026 OpenDeck. MIT License.` |
| **Additional license terms** | _(leave empty — Standard Application License Terms apply)_ |

---

## Description (≤10,000)

```
OpenDeck is a clean, focused player for presentation "decks" — self-contained HTML presentations packaged as .deck files. Install it once, then open and present any deck you already have. No account, no sign-in, and no internet connection required.

WHY OPENDECK
A downloaded HTML presentation rarely behaves when you open it straight from a folder — links break, fonts go missing, animations stall. OpenDeck gives every deck a proper home: each one renders the way its author intended, full-screen and offline, on your Windows PC.

PRESENT ANYWHERE
• Click or press the arrow keys to move between slides.
• Full-screen, distraction-free playback.
• Step-by-step reveals, tooltips, and baked-in narration all play exactly as built.
• The same deck looks and behaves identically across every device you run OpenDeck on.

YOUR LIBRARY
• Import decks from File Explorer, drag-and-drop, or the Windows Share menu.
• Everything is organized in one tidy library.
• A short welcome deck and a few example decks are included so you can see how it works on first launch.

PRIVATE BY DESIGN
• OpenDeck collects no data and makes no network requests.
• Everything you open stays on your device — there is no server to send it to.
• No analytics, no ads, no trackers.
• Each deck runs in an isolated, sandboxed view, kept separate from the rest of the app.

BEAUTIFUL & ACCESSIBLE
• Light, Dark, and Auto appearance that follows your system.
• Respects your contrast, transparency, and reduced-motion preferences.
• A quiet, type-led "paper" design that gets out of the way of your content.

MAKE YOUR OWN
Decks are an open format — a single HTML file plus a small manifest. Create them with the free OpenDeck skill for AI coding agents, or any tool that exports the format. Learn more at open-deck.org.

OpenDeck is open source and released under the MIT License.
```

## Short description (≤1,000)

```
Open and present .deck and HTML presentations on Windows. No account, no sign-in, fully offline — and nothing you open ever leaves your device.
```

## Product features (up to 20, ≤200 each)

```
Open and present self-contained HTML "decks" full-screen
Works completely offline — no account, no sign-in
Collects no data, makes no network requests, no ads or trackers
Each deck runs in an isolated, sandboxed view
Import from File Explorer, drag-and-drop, or the Share menu
Step-by-step reveals, tooltips, and narration play exactly as built
Light, Dark, and Auto themes that follow your system
Open format — make your own with any tool that exports .deck
```

## Search terms (up to 7 terms · ≤40 chars each · ≤21 words total — enter as separate rows)

```
HTML presentation viewer
deck file player
offline slideshow
present slides
slide presenter
keynote alternative
pitch deck viewer
```
_(17 words total)_

## What's new in this version (≤1,500)

```
First release of OpenDeck for Windows — open and present your HTML decks, fully offline and private by design.
```

---

## Store images (in `docs/store/microsoft/`)

| Partner Center slot | File |
|---|---|
| Screenshots → Desktop (3) | `docs/store/microsoft/screenshots/desktop/01-library.png`, `02-presenting.png`, `03-settings.png` _(**Windows-native captures** — must not show macOS/iOS UI; see [screenshots/desktop/README.md](screenshots/desktop/README.md))_ |
| Store logos → 9:16 Poster art | `docs/store/microsoft/store-images/poster-art-1440x2160.png` |
| Store logos → 1:1 Box art | `docs/store/microsoft/store-images/box-art-1080x1080.png` |
| Store logos → 1:1 App tile icon | `docs/store/microsoft/store-images/app-tile-300x300.png` (150/71 also available) |
| Windows and Xbox image → 16:9 Super hero art | `docs/store/microsoft/store-images/super-hero-1920x1080.png` _(title-free, OG style)_ |

Logos generated from `docs/assets/opendeck-icon.svg`; super hero art rendered from an
OG-style HTML template (Newsreader + paper background, no wordmark — the slot forbids
the product title). Skip the **Xbox** screenshot tab (device family not supported).

---

## Age ratings → IARC → "Everyone" / PEGI 3

App Type: **All Other App Types**. Every content question → **No**:
- Online content (catalog/streamed/AI) → No (decks are local files the user imports; no online library).
- Age-restricted products (tobacco/alcohol/firearms/gambling) → No.
- Shares precise location with other users → No.
- Purchase of digital goods → No.
- Cash/gift-card/play-to-earn/crypto/NFT rewards → No.
- Web browser or search engine → No (local sandboxed document viewer).
- Primarily a news or educational product → No (general-purpose presentation viewer).

Result: lowest rating (Everyone / PEGI 3), matching the Apple 4+ pass.

## Product declarations

- Accessibility tested → **unchecked** (real a11y features exist but no formal test pass was run; revisit in an update).
- Record/broadcast clips ("game" feature) → **unchecked** (Games-only; we're Productivity).
- Installs to alternate drives / removable storage → checked (true for MSIX).
- OneDrive automatic backup of app data → checked (harmless, accurate).
- Makes purchases outside Store commerce / pen & ink / generative AI → **unchecked**.

---

## Notes for certification (paste into the submission)

```
OpenDeck is a viewer for self-contained HTML documents ("decks"), analogous to a PDF reader or a browser opening a local page. Decks are content the user explicitly imports (via File Explorer, drag-and-drop, or the Share menu) — they are not code that changes the app's own features, and the app ships no in-app store or remote-content fetch.

PACKAGING: This is a PWA packaged via PWABuilder. The runFullTrust capability is required by the standard hosted-app container; the app itself is a sandboxed web view that makes no privileged system calls and collects no data.

ISOLATION: Each deck renders inside a sandboxed, cross-origin iframe served from an isolated origin, separate from the app shell. The sandbox withholds top-level navigation, so a deck can never replace or reach the app shell. The app's own functionality is fixed; decks cannot alter it.

TO TEST PRESENTING: on first launch the app preloads a short "Welcome" deck plus three example decks — open any of them from the library and move through the slides by clicking or pressing the left/right arrow keys.

CONTENT RIGHTS: The bundled example decks are first-party sample content; any photographs in them are licensed stock imagery (Pexels License, which permits commercial and in-app use).

The app collects no data and makes no network requests; everything is stored on-device.
```

### Demo / review account
Not applicable — no login or account.
