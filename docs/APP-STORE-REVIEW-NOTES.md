# App Store / HIG Review Notes

Paste-ready notes and a pre-submission checklist for OpenDeck. Reflects the
2025–2026 Human Interface Guidelines (Liquid Glass) and App Review Guidelines.

## ⚠️ Critical: Guideline 2.5.2 (executable code)

OpenDeck imports and runs user-provided HTML/JS "decks." Frame this correctly
in **App Review notes** to avoid a 2.5.2 rejection:

> OpenDeck is a viewer for self-contained HTML *documents* (decks), analogous to
> a PDF reader or a web browser opening a local page. Decks are **content the
> user explicitly imports** (Files, AirDrop, share sheet) — not code downloaded
> to change the app's own features. Each deck runs in a **sandboxed,
> cross-origin iframe** served from an isolated origin (`deck://` on iOS/macOS,
> a separate WebView host on Android). The sandbox withholds
> `allow-top-navigation`, so a deck can never replace or reach the shell or the
> Capacitor bridge. The app's functionality is fixed; decks cannot alter it.

Do **not** add any feature that fetches remote decks automatically or executes
code that changes the app itself — keep import user-initiated.

## Guideline 4.2 (minimum functionality)

A "generic player" can be flagged as thin. Mitigation already in place: library
management, import, settings, theming, accessibility. Keep the welcome deck and
clear onboarding so first-run shows real value.

## Privacy (nutrition label = "Data Not Collected")

OpenDeck stores everything on-device (IndexedDB on web; app-managed Filesystem
on native) and makes **no network requests** — fonts and icons are bundled, not
fetched. In App Store Connect, declare **no data collection**. The Settings →
Privacy row states this to the user verbatim.

## Design conformance (HIG 4.0) — done

- [x] Light / Dark / **Auto** appearance, system-driven + manual override.
- [x] Safe-area insets on every bar (`env(safe-area-inset-*)`), `viewport-fit=cover`.
- [x] No browser `confirm()`/`alert()` — in-app sheet + toast instead.
- [x] SF-Symbol-adjacent inline icons; no CDN dependency.
- [x] Translucent (Liquid-Glass-style) bars that degrade to solid under Reduce Transparency.

## Accessibility — done

- [x] `prefers-reduced-transparency`, `prefers-contrast`, `prefers-reduced-motion` all honored.
- [x] **No** `maximum-scale`/`user-scalable=no` → Dynamic Type & zoom work; `rem` sizing.
- [x] Visible focus rings, `aria-label`s, `role="dialog"`/`aria-modal`, `aria-live` status.
- [x] Touch targets ≥ 44pt (iOS) / 48dp (Android).

## App icon (layered, Liquid Glass) — action required at build

The master is `docs/assets/opendeck-icon.svg` with `#bg` (paper) and `#fg`
(deck mark) groups. To produce the icon set:

1. Open **Icon Composer** (Xcode 26+ / Apple Design Resources).
2. Import the two layers (background = `#bg`, foreground = `#fg`).
3. Generate **light, dark, and tinted** variants (dark: bg `#0A0A0A`, card
   `#F4F4EF`, lens stroke `#0A0A0A`).
4. Export the `.icon`/asset catalog into the iOS project; add the adaptive icon
   to `android/app/src/main/res` (foreground/background drawables).

## Cross-platform behavior

- **Android:** hardware/gesture **Back** steps out layer by layer then exits
  (wired in `app.js`); ≥48dp targets. Same Zen visuals as iOS/Mac.
- **macOS (Catalyst):** hover states, right-click → delete sheet, resizable
  window (the `auto-fill` grid reflows).

## Pre-submission checklist

- [ ] Run on device in both light and dark, plus Reduce Transparency / Increase Contrast / Larger Text.
- [ ] Verify Back exits cleanly on Android; verify file-open/share import on all platforms.
- [ ] Confirm zero outbound network requests (Instruments / proxy).
- [ ] Generate and install the layered app icon.
- [ ] Fill App Review notes with the 2.5.2 framing above.
