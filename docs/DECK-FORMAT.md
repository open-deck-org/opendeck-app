# Deck package format

A **deck** is a Zip archive (extension `.deck`, or plain `.zip`) whose root
contains a `deck.json` manifest and an HTML entry point.

```
my-talk.deck
├── deck.json          # manifest (required)
├── index.html         # entry point
├── assets/
│   ├── logo.svg
│   └── bg.jpg
└── slides/
    └── chart.js
```

If the zip wraps everything in a single top-level folder, OpenDeck strips it
automatically, so both `my-talk.deck → index.html` and
`my-talk.deck → my-talk/index.html` work.

## `deck.json`

```json
{
  "schema": 1,
  "id": "q3-review",
  "title": "Q3 Business Review",
  "entry": "index.html",
  "orientation": "landscape",
  "author": "Jane Doe",
  "version": "1.2.0",
  "thumbnail": "cover.png"
}
```

| Field | Required | Default | Notes |
|-------|----------|---------|-------|
| `schema` | no | `1` | Format version. |
| `id` | no | derived from filename + size | `[A-Za-z0-9-_]+`. Used as the deck's origin path/host segment. Stable id ⇒ re-import replaces in place. |
| `title` | no | `id` | Shown in the library. |
| `entry` | no | `index.html` if present | Must exist in the package. |
| `orientation` | no | `"any"` | `"landscape"` / `"portrait"` / `"any"`. Best-effort lock on native. |
| `author` | no | `""` | Shown on the card. |
| `version` | no | `"1.0.0"` | Shown on the card. |
| `thumbnail` | no | none | Relative path to a preview image inside the package, shown on the library card. Ignored if the file is missing (card falls back to a placeholder glyph). |

`deck.json` is optional: a zip with just an `index.html` imports fine and gets
sensible defaults (this is exactly `www/samples/welcome/`).

## Authoring guidance

- **Self-contained:** reference only files inside the package, with relative
  URLs. There is no network by default (a restrictive CSP is applied on native).
- **Origin behavior:** the deck runs at its own origin, so relative paths, ES
  modules, `fetch('./data.json')`, `<canvas>`, WebGL, audio/video all work.
- **No bridge:** the deck is sandboxed; `window.parent` and `Capacitor` are not
  reachable by design.
- **Input:** handle both keyboard (arrows) and touch (tap zones / swipe) — see
  the sample for a tiny reference implementation.
- **Safe area:** respect `env(safe-area-inset-*)` for notches/home indicators.

## Building a `.deck`

Any zip tool works, as long as `deck.json` is at the archive root:

```bash
cd my-talk && zip -r ../my-talk.deck . -x '.*'
```

Or use the included script as a template (`scripts/build-sample-deck.mjs`,
`npm run build:sample`), which zips a folder with fflate.
