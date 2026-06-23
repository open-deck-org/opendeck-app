# App Store screenshots

Ready-to-upload screenshots, captured from the iOS 26.1 Simulator at the exact
pixel sizes App Store Connect requires. All portrait.

Suggested gallery order (App Store Connect lets you drag to reorder):

| # | iPhone 6.9" (1320 × 2868) | iPad 13" (2064 × 2752) | Mac (2880 × 1800) | Shot |
|---|---|---|---|---|
| 1 | `iphone-6.9/01-library.png` | `ipad-13/01-library.png` | `mac/01-library.png` | Library — welcome + 3 showcase decks |
| 2 | `iphone-6.9/02-presenting.png` | `ipad-13/02-presenting.png` | `mac/02-presenting.png` | A deck presenting |
| 3 | `iphone-6.9/03-settings.png` | `ipad-13/03-settings.png` | `mac/03-settings.png` | Settings — appearance, privacy, version 1.0.0 |
| 4 | `iphone-6.9/04-favorites.png` | `ipad-13/04-favorites.png` | `mac/04-favorites.png` | Favorites filter (sparse — 1 starred; re-shoot with 2–3 for a fuller grid, or drop) |

Minimum is 1 per display; up to 10. iPhone/iPad are portrait; Mac is landscape
(2880×1800, a valid Mac size — others: 1280×800, 1440×900, 2560×1600).

## How these were made

- Simulators: iPhone 16 Pro Max (6.9"), iPad Pro 13" (M4), iOS 26.1 — captured
  with `xcrun simctl io <udid> screenshot`.
- Mac: the Mac (Catalyst) Debug build, window sized to 1440×900 logical and
  captured with `screencapture -o -R<x,y,1440,900>` → 2880×1800 on Retina.
- Library/Settings/Favorites are framebuffer grabs; presenting shots were taken
  with a deck open in the app.
