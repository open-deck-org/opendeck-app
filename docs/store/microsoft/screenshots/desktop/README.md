# Microsoft Store — Desktop screenshots (Windows-native)

**These must be captured on Windows, showing Windows UI.** Reusing the macOS
(`../../../apple/screenshots/mac/`) or iOS screenshots here is what triggered the
certification failure under policy **10.1.1.3 (Inaccurate Representation)** —
"Images should not show non-Windows UI or devices."

## Required shots (match the listing copy)

| File | View |
|---|---|
| `01-library.png`    | Library — welcome + 3 showcase decks |
| `02-presenting.png` | A deck presenting, full-screen |
| `03-settings.png`   | Settings — appearance, privacy, version |

## How to capture

The Windows build is the PWA packaged via PWABuilder → MSIX, pinned to
`https://app.open-deck.org`.

- **Preferred:** install the submitted MSIX on Windows 11, launch OpenDeck, and
  screenshot the running app (Win+Shift+S / Snipping Tool). The window must show
  Windows chrome (Mica title bar, Windows min/max/close controls).
- **Fallback:** open `https://app.open-deck.org` in **Edge on Windows** →
  "Install as app", which produces the same PWA window chrome the MSIX uses.

## Specs

- Format **PNG**, dimensions between **1366×768 and 3840×2160** (target 1920×1080).
- No visible macOS traffic-light buttons, no iOS/iPadOS chrome.
- 1 minimum, up to 10. Skip the **Xbox** tab (device family not supported).
