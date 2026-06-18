# OpenDeck — Design System ("Zen / Paper")

The shell UI follows one idea: **deference**. The app is a quiet paper stage;
the deck is the show. Hierarchy comes from **type and space**, never decoration.
Identical aesthetic on iOS, macOS (Catalyst), and Android — only platform
*behavior* differs (Android hardware back, touch-target minimums).

## Foundations

| Aspect | Choice |
|---|---|
| **Type** | `Inter` (UI/labels) + `Newsreader` (serif titles & deck names) — both OFL, **bundled locally** in `www/fonts/` (latin variable subsets). No web-font CDN: works offline and avoids third-party IP logging (a privacy + App Review concern). System fallbacks: `-apple-system`, `ui-serif`. |
| **Color** | Monochrome. Light = ink `#1A1A1A` on paper `#FAFAF8`; dark = `#F4F4EF` on `#0A0A0A`. **No accent color** — ink *is* the accent. The only chromatic color is one restrained, muted red used solely for destructive actions. |
| **Shape** | Continuous radii: 22 / 16 / 10 / 6 px. |
| **Motion** | Spring-ish `cubic-bezier(0.16,1,0.3,1)`; 160/280/460ms. Fully collapsed under Reduce Motion. |
| **Icons** | Inline SVG (`js/icons.js`), single 1.5px stroke, SF-Symbol-adjacent. Bundled — no CDN. |

All values are CSS custom properties in `www/styles.css`, themed by `:root`,
`:root[data-theme="…"]`, and a `prefers-color-scheme` block for Auto.

## Theming (light / dark / auto)

- **Auto** (default): no `data-theme` attribute → the OS `prefers-color-scheme`
  drives the tokens.
- **Manual**: `data-theme="light|dark"` on `<html>`, chosen in Settings →
  Appearance, persisted in `localStorage` (`opendeck.theme`). Works in every
  Capacitor WebView.

## Card size (grid density)

The deck grid's column min-width is the `--card-min` token, consumed by
`grid-template-columns: repeat(auto-fill, minmax(var(--card-min, 180px), 1fr))`.
Settings → Appearance → **Card size** sets it: Small `140px` · **Medium**
(default — attribute omitted, falls back to `180px`) · Large `240px`. Persisted
in `localStorage` (`opendeck.cardsize`) and applied via `:root[data-cardsize="…"]`,
exactly mirroring the theme mechanism above.

## Screens

- **Library** — sticky serif title bar (`Decks`) with Settings + Import; a
  breathing grid of barely-there cards (serif name clamped to 2 lines, quiet
  single-line `v# · author`, 16:10 thumbnail). Each card carries one
  always-visible top-right control that doubles as favorite marker *and* actions
  menu — a star when favorited, `•••` otherwise; tapping it always opens the
  actions sheet. Grid density is user-adjustable (Settings → Appearance → Card
  size). Empty state: "A quiet shelf."
- **Player** — full-bleed deck in the sandboxed cross-origin iframe. Slim
  translucent bar (Back · title · Immersive). The bar is absolutely positioned
  and the stage is inset by a **constant** amount, so toggling immersive never
  resizes the iframe (avoids a WKWebView iframe-resize bug). Immersive leaves a
  faint reveal handle — the user is never trapped.
- **Settings** — grouped-inset list: Appearance (Theme: Auto/Light/Dark; Card
  size: Small/Medium/Large segmented), About, Privacy, Open source.

## Interaction principles

- **No browser dialogs.** Deletes use an in-app bottom sheet, never
  `confirm()`/`alert()` (those are an instant "not native" tell and a review
  smell). Status uses an in-app toast.
- **Delete affordances:** hover/focus ✕ on pointer devices (always visible on
  touch), long-press, and desktop right-click — all route to the same sheet.
- **Keyboard:** `Esc` steps out layer by layer (sheet → immersive → player →
  settings); `Enter`/`Space` activate cards and the import control.

## App icon

Master: `docs/assets/opendeck-icon.svg` — a serif "deck, opened" mark (ink card
+ paper lens) on paper. Two groups (`#bg`, `#fg`) map to **Icon Composer**
layers for the iOS/macOS layered Liquid Glass icon (light/dark/tinted). See
`docs/APP-STORE-REVIEW-NOTES.md` for the build step.

## Accessibility (honored, not bolted on)

- `prefers-reduced-transparency` → translucent bars fall back to solid.
- `prefers-contrast: more` → thicker hairlines, stronger secondary text, ink focus ring.
- `prefers-reduced-motion` → transitions/animations collapse.
- `rem` units throughout + **no zoom lock** in the viewport → Dynamic Type / pinch-zoom work.
- Visible focus rings; `aria-label`s on icon controls; `role="dialog"`/`aria-modal` on overlays; `aria-live` toast.
- Touch targets ≥ 44pt / 48dp.
