# Building OpenDeck

How to build and run the player on every platform, plus the environment-specific
gotchas we hit (so future-you doesn't re-discover them). For *what* the native
layer does and *why*, see [ARCHITECTURE.md](ARCHITECTURE.md) and
[NATIVE-INTEGRATION.md](NATIVE-INTEGRATION.md).

---

## TL;DR cheat sheet

| Goal | Command |
|------|---------|
| Run the web shell | `npm install && npm run dev` → http://localhost:5173 |
| Build a sample `.deck` | `npm run build:sample` → `dist/welcome.deck` |
| Add native platforms | `npm run add:ios` · `npm run add:android` |
| (Re)wire the iOS target | `ruby scripts/configure-ios.rb` (add `DEVELOPMENT_TEAM=…` for signing) |
| iOS simulator build | `xcodebuild -workspace ios/App/App.xcworkspace -scheme App -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' build CODE_SIGNING_ALLOWED=NO` |
| Mac Catalyst build+run (local) | see [§ macOS](#macos-mac-catalyst) |
| Android debug APK | see [§ Android](#android) |
| Gather all outputs into `dist/` | `npm run dist:collect` |

After any change under `www/`, run **`npx cap copy`** to push it into the native
projects (`npm run dev` reads `www/` directly, so the web path needs no copy).

## Collected outputs (`dist/`)

After building, `npm run dist:collect` copies the latest artifact for each
platform into one place (it's the analogue of Gradle's `app/build/outputs`):

```
dist/android/OpenDeck-debug.apk      # adb install …
dist/macos/OpenDeck.app              # open dist/macos/OpenDeck.app  (double-click)
dist/ios/OpenDeck-simulator.app      # simctl install (simulator only)
dist/welcome.deck                     # sample package (npm run build:sample)
```

`dist/` artifacts are git-ignored (binaries); `dist/README.md` documents them.
See `scripts/collect-dist.sh` — it prefers the ad-hoc-signed Catalyst app in
`build/mac` over any signing-disabled DerivedData build.

---

## Prerequisites (and what this machine had)

| Tool | Needed for | This machine |
|------|-----------|--------------|
| Node ≥ 18 | everything | v22 |
| Xcode + CLT | iOS / macOS | Xcode 26.1.1 |
| CocoaPods | iOS pods | 1.16.2 |
| Ruby + `xcodeproj` gem | `configure-ios.rb` | ships with CocoaPods |
| JDK 17+ | Android Gradle | OpenJDK 21 (`/usr/libexec/java_home`) |
| Android SDK | Android | `/Volumes/Apps/Android/sdk` (no `ANDROID_HOME` set by default) |
| Apple signing identity | device/Mac signed run | `Apple Development: sdjukic@gmail.com (W787DRC653)` |

---

## First-time setup

```bash
npm install                  # also vendors fflate into www/vendor/ (postinstall)
npm install -D typescript    # REQUIRED before `cap add` — capacitor.config.ts needs it
# @capacitor/ios + @capacitor/android are already in package.json; if missing:
#   npm install @capacitor/ios @capacitor/android
npm run add:ios              # cap add ios  + pod install
npm run add:android          # cap add android
ruby scripts/configure-ios.rb   # registers Swift files + enables Catalyst (see below)
```

> ⚠️ `cap add ios` regenerates the `ios/` project. The two OpenDeck Swift files
> (`DeckSchemeHandler.swift`, `DeckSupport.swift`) live in `ios/App/App/` but must
> be **registered in the Xcode target** — that's what `scripts/configure-ios.rb`
> does (idempotent). **Re-run it after any fresh `cap add ios`.** It also sets
> `SUPPORTS_MACCATALYST = YES` and, if `DEVELOPMENT_TEAM` is set, automatic signing.

---

## Web / PWA

```bash
npm run dev      # serves www/ over http (the service worker needs http, not file://)
```
The first load registers a service worker that serves decks from `/__deck__/<id>/…`
and seeds the bundled **Welcome** deck. Import `.deck`/`.zip` via the **Import deck**
button. This is the dev/preview surface; full cross-origin isolation is a *native*
property (see ARCHITECTURE.md).

---

## iOS

**Build for the simulator (no signing):**
```bash
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -sdk iphonesimulator -configuration Debug \
  -destination 'generic/platform=iOS Simulator' \
  build CODE_SIGNING_ALLOWED=NO
```

**Install + launch + screenshot on a simulator** (how we verified the runtime):
```bash
DEV=$(xcrun simctl list devices available | grep -m1 -o '[0-9A-F-]\{36\}')   # first available
xcrun simctl boot "$DEV"
APP=$(find ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphonesimulator -name App.app | head -1)
# (this machine's DerivedData was /Volumes/Apps/XcodeDerivedData/… — adjust if customised)
xcrun simctl install "$DEV" "$APP"
xcrun simctl launch "$DEV" org.opendeck
xcrun simctl io "$DEV" screenshot /tmp/lib.png   # simctl CAN screenshot (unlike screencapture)
```

**Signed device build:** open `ios/App/App.xcworkspace` in Xcode, select your team
(the Apple ID must be in Xcode → Settings → Accounts), Run. Or headless:
```bash
DEVELOPMENT_TEAM=XXXXXXXXXX ruby scripts/configure-ios.rb   # enable automatic signing
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -destination 'generic/platform=iOS' -allowProvisioningUpdates build
```

---

## macOS (Mac Catalyst)

Catalyst reuses the iOS target (`SUPPORTS_MACCATALYST=YES`, set by
`configure-ios.rb`). No extra code — it runs the same `deck://` handler and shell.

**Build + run locally with ad-hoc signing** (no Apple account needed; runs only on
the build machine — this is how we ran it this session):
```bash
xcodebuild -workspace ios/App/App.xcworkspace -scheme App -configuration Debug \
  -destination 'platform=macOS,variant=Mac Catalyst' -derivedDataPath build/mac \
  CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY="-" \
  DEVELOPMENT_TEAM="" PROVISIONING_PROFILE_SPECIFIER="" build
open build/mac/Build/Products/Debug-maccatalyst/App.app
```

**Build-only check** (CI-style):
```bash
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -destination 'platform=macOS,variant=Mac Catalyst' build CODE_SIGNING_ALLOWED=NO
```

> Automatic signing for Catalyst wants a **Mac Development** cert + the Apple ID in
> Xcode's Accounts. We only had a unified *Apple Development* cert and no logged-in
> account headless, so automatic provisioning failed — hence the ad-hoc path above.

---

## Android

The Android Java + manifest are validated; a debug APK builds. The project pins
`compileSdkVersion = 36` (see gotcha below).

```bash
export ANDROID_HOME=/Volumes/Apps/Android/sdk          # this machine's SDK
export JAVA_HOME=$(/usr/libexec/java_home)
echo "sdk.dir=$ANDROID_HOME" > android/local.properties # machine-specific; gitignored

cd android
yes | "$ANDROID_HOME/cmdline-tools/latest/bin/sdkmanager" --licenses   # one-time
./gradlew assembleDebug        # → app/build/outputs/apk/debug/app-debug.apk
```

**Install / run** (needs an emulator/AVD or a USB device):
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

**Inspect the merged manifest** (how we confirmed the deck intent-filters):
```bash
AAPT=$(ls $ANDROID_HOME/build-tools/*/aapt2 | head -1)
"$AAPT" dump xmltree app/build/outputs/apk/debug/app-debug.apk --file AndroidManifest.xml
```

---

## Authoring decks (the `spiel-deck` skill)

Decks are produced by the **spiel-deck** skill at
`/Volumes/Apps/dev/opendeck-skill/spiel-deck/`. To package one for this app:

- In the browser console of a loaded deck: `deckExport.deck()` → downloads `<id>.deck`.
- Or ask the agent: *"export as a .deck presentation"*.

A `.deck` is a zip with `deck.json` + `index.html` (the standalone export) at the
root. Format details: [DECK-FORMAT.md](DECK-FORMAT.md).

---

## Gotchas we hit this session (don't re-learn these)

1. **`cap add` needs TypeScript installed** — `capacitor.config.ts` won't load
   otherwise (`Could not find installation of TypeScript`). `npm install -D typescript`.
2. **Re-run `scripts/configure-ios.rb` after any `cap add ios`** — the OpenDeck
   Swift files must be (re)added to the Xcode target; Catalyst + signing too.
3. **Android `android-34` metadata parse bug** on this machine's SDK:
   `Build properties not found for package Android SDK Platform 34` /
   `unexpected element abis`. Worked around by pinning `compileSdkVersion = 36`
   in `variables.gradle`. If your SDK has a clean `android-34`, revert to 34.
4. **`screencapture` can't see app windows headlessly** — without Screen Recording
   permission it captures only the desktop wallpaper + menu bar. Verify UI another
   way: `simctl io … screenshot` for iOS; the **accessibility tree** for the Mac app:
   ```bash
   osascript -e 'tell application "System Events" to tell process "App" to entire contents of window 1'
   ```
5. **Catalyst automatic signing fails headless** — no Apple account in Xcode → use
   ad-hoc (`CODE_SIGN_IDENTITY="-"`) for a local Mac run.
6. **Storage location must match the native handlers** — the JS store writes via
   Capacitor `Directory.Library` (iOS `Library/decks/`, Android `filesDir/decks/`).
   The `deck://` handler and `DeckWebViewClient` read from there. Don't change one
   without the others.
7. **Deck URL differs per platform** (`player.js` → `deckUrl()`): `deck://` on
   iOS/macOS, `https://decks.opendeck/` on Android (real https origin avoids
   WebView custom-scheme iframe quirks), `/__deck__/` on web.

---

## What's been verified

| | Build | Runtime |
|---|---|---|
| Web | — | ✅ present + import in a browser |
| iOS | ✅ simulator build | ✅ runs in simulator; library seeds + renders |
| macOS | ✅ Catalyst build | ✅ runs as a native Mac app (AX tree confirms the library) |
| Android | ✅ debug APK | ⏳ needs an emulator/device to run |

Still genuinely manual (need a device/human): tap-to-present `deck://` on a real
iOS device, AirDrop/share-import a `.deck`, and an Android emulator run.
