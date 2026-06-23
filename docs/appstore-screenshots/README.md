# App Store screenshots

Ready-to-upload screenshots, captured from the iOS 26.1 Simulator at the exact
pixel sizes App Store Connect requires. All portrait.

Suggested gallery order (App Store Connect lets you drag to reorder):

| # | iPhone 6.9" (1320 × 2868) | iPad 13" (2064 × 2752) | Shot |
|---|---|---|---|
| 1 | `iphone-6.9/01-library.png` | `ipad-13/01-library.png` | Library — welcome + 3 showcase decks |
| 2 | `iphone-6.9/02-presenting.png` | `ipad-13/02-presenting.png` | A deck presenting |
| 3 | `iphone-6.9/03-settings.png` | `ipad-13/03-settings.png` | Settings — appearance, privacy, version 1.0.0 |
| 4 | `iphone-6.9/04-favorites.png` | `ipad-13/04-favorites.png` | Favorites filter (sparse — 1 starred; re-shoot with 2–3 for a fuller grid, or drop) |

Minimum is 1 per display; up to 10. Keep one orientation per display (these are
all portrait).

## Still needed: Mac

The **Mac** listing needs a separate screenshot (1280×800, 1440×900, or
2560×1600). Capture it from the running Mac (Catalyst) app — `⇧⌘4` then space to
grab the window, or screenshot the deck full-screen. Drop it in a `mac/` folder
here.

## How these were made

- Simulators: iPhone 16 Pro Max (6.9"), iPad Pro 13" (M4), iOS 26.1.
- Library shots: `xcrun simctl io <udid> screenshot` of the framebuffer.
- Presenting shots: deck opened in the app, captured the same way.

To re-shoot, boot the sim, install the Debug build, and screenshot via `simctl`.
