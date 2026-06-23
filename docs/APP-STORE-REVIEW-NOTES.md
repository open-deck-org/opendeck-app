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

## App icon (light / dark / tinted) — done

The `AppIcon` set ships all three iOS-18 appearances as single-size 1024²
opaque PNGs, declared in
`ios/App/App/Assets.xcassets/AppIcon.appiconset/Contents.json`:

- `AppIcon-light-1024.png` — default (paper).
- `AppIcon-dark-1024.png` — dark luminosity.
- `AppIcon-tinted-1024.png` — tinted luminosity; grayscale-on-black master
  `docs/assets/opendeck-icon-tinted.svg` (system maps luminance to the user's
  tint). Regenerate with
  `rsvg-convert -w 1024 -h 1024 docs/assets/opendeck-icon-tinted.svg | magick - -background black -alpha remove ...`.

Validated with `actool` (compiles to `Assets.car`, no warnings).

Optional / still open:
- The **Icon Composer `.icon` layered (Liquid Glass specular) bundle** needs the
  GUI (Icon Composer.app). The appearance-aware appiconset above is fully App
  Store valid; the layered `.icon` is a polish upgrade, not a requirement.
- **Android** adaptive icon (`android/app/src/main/res` foreground/background
  drawables) — only if shipping Play.

## Cross-platform behavior

- **Android:** hardware/gesture **Back** steps out layer by layer then exits
  (wired in `app.js`); ≥48dp targets. Same Zen visuals as iOS/Mac.
- **macOS (Catalyst):** hover states, right-click → delete sheet, resizable
  window (the `auto-fill` grid reflows).

## Privacy manifest — done

`ios/App/App/PrivacyInfo.xcprivacy` ships in the app bundle (wired into the
`App` target's Resources build phase). It declares `NSPrivacyTracking=false`, no
tracking domains, no collected data, and the required-reason APIs that Capacitor
core + the Filesystem plugin touch (UserDefaults `CA92.1`, file timestamps
`C617.1`, disk space `E174.1`). Required by App Store since May 2024.

## Submission scope — iOS + iPadOS + macOS (one Apple effort)

Single Xcode target: `TARGETED_DEVICE_FAMILY = "1,2"` (iPhone + iPad) and
`SUPPORTS_MACCATALYST = YES`. The Mac build reuses `org.opendeck`
(`DERIVE_MACCATALYST_PRODUCT_BUNDLE_IDENTIFIER = NO`). In App Store Connect this
is still **two platform listings** (iOS and macOS) under one app record, each
needing its own screenshots.

## Pre-submission checklist

Code / project (done):
- [x] Privacy manifest added and bundled.
- [x] `UIRequiredDeviceCapabilities` corrected `armv7` → `arm64`.
- [x] App icon light / dark / tinted appearances (validated with `actool`).
- [x] `IPHONEOS_DEPLOYMENT_TARGET` raised 13.0 → 15.0 (app + Podfile; pods reinstalled).

Still required before upload:
- [ ] Run on device (iPhone, iPad, Mac) in light + dark, plus Reduce Transparency / Increase Contrast / Larger Text.
- [ ] Verify file-open/share `.deck` import on all platforms (and Android Back if shipping Play).
- [ ] Confirm zero outbound network requests (Instruments / proxy).
- [ ] Archive (Generic iOS Device + Mac) with a Distribution profile; pass Organizer validation.
- [ ] App Store Connect: privacy-policy URL, support URL, screenshots (6.9"/6.7" iPhone, 13" iPad, Mac), age rating, "Data Not Collected" label.
- [ ] Fill App Review notes with the 2.5.2 framing above.
