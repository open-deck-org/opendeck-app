# dist/ — collected build outputs

All platform artifacts gathered in one place by `npm run dist:collect`
(`scripts/collect-dist.sh`), which copies the latest build of each platform here.
These are build outputs — git-ignored; rebuild them, don't commit them.

```
dist/
├── android/OpenDeck-debug.apk      gradle debug APK  →  adb install dist/android/OpenDeck-debug.apk
├── macos/OpenDeck.app              Mac Catalyst app  →  open dist/macos/OpenDeck.app   (double-click)
├── ios/OpenDeck-simulator.app      iOS Simulator build (install via simctl, not double-click)
└── welcome.deck                     sample package    →  Import it in the app
```

## How each was produced

| Artifact | Build command |
|----------|---------------|
| `android/OpenDeck-debug.apk` | `cd android && ./gradlew assembleDebug` |
| `macos/OpenDeck.app` | Mac Catalyst ad-hoc build (see [docs/BUILDING.md § macOS](../docs/BUILDING.md#macos-mac-catalyst)) |
| `ios/OpenDeck-simulator.app` | iOS Simulator build (see [docs/BUILDING.md § iOS](../docs/BUILDING.md#ios)) |
| `welcome.deck` | `npm run build:sample` |

After building any platform, run `npm run dist:collect` to refresh this folder.

## Running

- **macOS:** `open dist/macos/OpenDeck.app` (ad-hoc signed; runs on the Mac that
  built it). For another Mac, build with your Apple team / notarization.
- **Android:** `adb install dist/android/OpenDeck-debug.apk` (needs an emulator or
  a USB-connected device).
- **iOS:** the simulator `.app` installs via
  `xcrun simctl install <booted-device> dist/ios/OpenDeck-simulator.app` — it does
  not run on a physical device (that needs a signed device build).
