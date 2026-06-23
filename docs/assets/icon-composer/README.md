# Icon Composer layers — OpenDeck

Pre-separated layers for building the **Icon Composer `.icon`** (Liquid Glass)
app icon. Source of truth is `../opendeck-icon.svg`; these are its `#bg` / `#fg`
groups split per appearance. Both SVG (crisp/vector) and 1024² PNG are provided —
Icon Composer accepts either; prefer the SVGs.

| File | Layer | Appearance | Notes |
|---|---|---|---|
| `bg-light.*` | Background | Light | Full-bleed paper gradient. Opaque. |
| `bg-dark.*`  | Background | Dark  | Full-bleed `#0A0A0A`. Opaque. |
| `fg-light.*` | Foreground | Light | Deck mark, **transparent** canvas. Dark card + white lens. |
| `fg-dark.*`  | Foreground | Dark  | Deck mark, **transparent** canvas. Light card + dark lens. |

Tinted appearance: let Icon Composer **auto-generate** it from the layers (it
monochromes them); no separate art needed.

## How to build the `.icon` (Icon Composer, Xcode 26+)

1. Open **Icon Composer.app** (ships with Xcode 26+; also in Apple Design Resources).
2. **New** → name it `AppIcon`.
3. **Background layer** → drop in `bg-light.svg`; in the layer's appearance
   options set the **Dark** variant to `bg-dark.svg`.
4. **Add a layer** above it for the foreground → drop in `fg-light.svg`; set its
   **Dark** variant to `fg-dark.svg`.
5. Leave **Tinted** to auto. Tune depth/shadow/specular to taste (the Liquid
   Glass material) — the mark should keep clear of the very edges.
6. **File → Export** → `AppIcon.icon`.
7. In Xcode, delete the old `AppIcon` set from `Assets.xcassets` and drag
   `AppIcon.icon` in (or set Target → Build Settings → *Asset Catalog App Icon
   Set Name* to `AppIcon`). Build; confirm with `actool` / the icon preview.

The existing flat light/dark/tinted `AppIcon.appiconset` already ships and is
valid — this `.icon` is a visual upgrade, not a requirement.
