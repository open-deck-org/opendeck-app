# Google Play screenshots & graphics

Ready-to-upload assets for the Play Console listing. Capture the device
screenshots from an Android emulator (or device) running the OpenDeck release
build; render the icon and feature graphic from the brand source in
[`../../../assets/`](../../../assets/).

Suggested gallery order (Play Console lets you drag to reorder):

| # | Phone (9:16 portrait) | 7" tablet | 10" tablet | Shot |
|---|---|---|---|---|
| 1 | `phone/01-library.png`    | `tablet-7/01-library.png`    | `tablet-10/01-library.png`    | Library — welcome + 3 example decks |
| 2 | `phone/02-presenting.png` | `tablet-7/02-presenting.png` | `tablet-10/02-presenting.png` | A deck presenting, full-screen |
| 3 | `phone/03-settings.png`   | `tablet-7/03-settings.png`   | `tablet-10/03-settings.png`   | Settings — appearance, privacy, version 1.0 |

Phone: **2 minimum**, up to 8. Tablet sets are optional but recommended (they
unlock the "Designed for tablets" surfacing and show the responsive grid).

## Specs

| Asset | Dimensions | Format |
|---|---|---|
| Phone / tablet screenshots | 9:16 portrait (or 16:9), each side **320–3840 px** | PNG (no alpha needed) |
| **App icon** | **512 × 512** | 32-bit PNG, ≤1 MB → `../store-images/icon-512.png` |
| **Feature graphic** | **1024 × 500** | PNG/JPG, **no alpha** → `../store-images/feature-graphic-1024x500.png` |

- Keep chrome **Android-native** (status bar, gesture nav) — no macOS
  traffic-lights or iOS chrome. Play doesn't fail on it the way the Microsoft
  Store does (policy `10.1.1.3`), but mixed-OS UI looks careless and can draw a
  manual-review flag.
- Target ~1080 × 2400 for phone, ~1600 × 2560 for 10" tablet.

## How to capture

The Android build is the Capacitor app (`org.opendeck`) embedding `www/`.

```bash
# 1. Build & install the release (or debug) build on an emulator/device
npm run dist:collect && npx cap sync android
npm run open:android            # run on a Pixel 8 + a tablet AVD from Android Studio

# 2. Grab framebuffer screenshots at native resolution
adb shell screencap -p /sdcard/01-library.png
adb pull /sdcard/01-library.png phone/01-library.png
```

- Phone: a **Pixel 8 / 8 Pro** AVD (1080 × 2400) is a clean 9:16.
- Tablets: a **7" (Nexus 7)** and **10" (Pixel Tablet)** AVD for the two tablet slots.
- Library / Settings are framebuffer grabs; the presenting shot is taken with a
  deck open and advanced one slide in.

## Brand art (icon + feature graphic)

- **App icon 512²:** render `docs/assets/opendeck-icon.svg` at 512×512 on the
  paper background (`#FAFAF8`, the same `ic_launcher_background` color), flatten
  to opaque PNG.
- **Feature graphic 1024×500:** reuse the OG-style paper template behind the
  Microsoft super-hero art (Newsreader + paper background, **wordmark-free**),
  rendered at 1024×500 with no alpha channel.
