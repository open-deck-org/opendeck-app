# Native integration

The native projects under `ios/` and `android/` are **already wired** for the
generic player — deck-content serving, file-type association, and file import.
This doc records *what was done* (so you can reproduce it after a clean
`cap add`) and how to build/verify each platform.

## Status

| Platform | Wired | Built & verified here |
|----------|-------|-----------------------|
| iOS | ✅ | ✅ builds; runs in simulator (library seeds + renders) |
| macOS (Catalyst) | ✅ | ✅ builds; **runs** as a native Mac app (ad-hoc signed) |
| Android | ✅ | ✅ debug **APK** builds (compileSdk 36); installs-ready |

Reproduce platforms from scratch any time:

```bash
npm install
npm run add:ios       # cap add ios + sync
npm run add:android   # cap add android + sync
ruby scripts/configure-ios.rb   # re-applies iOS target wiring (see below)
```

`npm run add:ios` regenerates `ios/`; re-run `scripts/configure-ios.rb` and
re-copy the Swift files / Info.plist keys if you ever delete and re-add the
platform. The Android edits live in tracked source files and survive `cap copy`.

---

## iOS / macOS (Catalyst)

**Files added to `ios/App/App/`:**
- `DeckSchemeHandler.swift` — `WKURLSchemeHandler` serving `deck://<id>/<path>`
  from `Library/decks/<id>/…` (where the JS store writes via Filesystem
  `Directory.Library`). Sends a restrictive CSP and a path-traversal guard.
- `DeckSupport.swift` — `DeckViewController` (registers the scheme handler on
  the webview config via the documented `webViewConfiguration(for:)` override)
  and `DeckImport` (reads an opened file and hands it to the shell).

**Edits:**
- `Base.lproj/Main.storyboard` → view controller class is now
  `DeckViewController` (module `App`).
- `AppDelegate.swift` → `application(_:open:)` routes file URLs to
  `DeckImport.handle(url:)`.
- `Info.plist` → exported UTI `org.opendeck.deck` (MIME tag
  **`application/x-deck`** — the canonical `.deck` type emitted by the exporter;
  keep all surfaces in sync), `CFBundleDocumentTypes` (deck = Owner, zip =
  Alternate), plus App Store framing keys (`LSApplicationCategoryType`,
  `ITSAppUsesNonExemptEncryption`).
- `scripts/configure-ios.rb` → adds the two Swift files to the App target and
  sets `SUPPORTS_MACCATALYST = YES` on all configs.

**Build:**
```bash
# iOS Simulator
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
  build CODE_SIGNING_ALLOWED=NO

# Mac Catalyst
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -destination 'platform=macOS,variant=Mac Catalyst' \
  build CODE_SIGNING_ALLOWED=NO
```
**Signing.** `scripts/configure-ios.rb` enables automatic signing when you pass
a team:
```bash
DEVELOPMENT_TEAM=XXXXXXXXXX ruby scripts/configure-ios.rb
```
For a signed device/Mac build, open `ios/App/App.xcworkspace` in Xcode and pick
your team (the Apple ID must be added in Xcode → Settings → Accounts). Catalyst
reuses the iOS target with no extra code.

**Run macOS locally without an Apple account** (ad-hoc, runs on the build Mac):
```bash
xcodebuild -workspace ios/App/App.xcworkspace -scheme App \
  -configuration Debug -destination 'platform=macOS,variant=Mac Catalyst' \
  -derivedDataPath build/mac \
  CODE_SIGN_STYLE=Manual CODE_SIGN_IDENTITY="-" DEVELOPMENT_TEAM="" \
  PROVISIONING_PROFILE_SPECIFIER="" build
open build/mac/Build/Products/Debug-maccatalyst/App.app
```
This was verified here: the app launches as a native Mac window and renders the
library with the seeded Welcome deck.

### App Store framing

OpenDeck is presented as a **document viewer** for `.deck` presentation files
the user already has — not an app platform. This keeps it clear of guidelines
**2.5.2** (no downloading code that changes the app) and **4.7** (HTML5
mini-apps): there's no in-app store, no remote shell-update mechanism, and decks
render as sandboxed documents with a restrictive CSP (`connect-src` is locked
down, so a deck can't phone home). The Info.plist declares the document types
and a productivity category. Enterprise/MDM or TestFlight distribution avoids
public review entirely.

---

## Android

**File added** to `android/app/src/main/java/org/opendeck/`:
- `DeckWebViewClient.java` — extends `BridgeWebViewClient`; intercepts
  `https://<id>.decks.opendeck/<path>` (and `deck://` for parity) in
  `shouldInterceptRequest` and serves from `filesDir/decks/<id>/…`. A distinct
  host **per deck** keeps decks cross-origin to the shell (`https://localhost`)
  *and* to each other.

**Edits:**
- `MainActivity.java` → installs `DeckWebViewClient` and handles `VIEW`/`SEND`
  intents: reads the file, base64-encodes it, and injects it into the shell as
  `window.__OPENDECK_PENDING` (poll-then-inject so it survives cold launch).
- `AndroidManifest.xml` → intent-filters for the `.deck` MIME
  (**`application/x-deck`**), the `.deck` extension (pathPattern fallback for when
  a provider reports a generic MIME), and shared `.deck`/`.zip`.

> The app emits `https://<id>.decks.opendeck/…` URLs on Android (see
> `player.js`), a real https origin that `shouldInterceptRequest` reliably
> catches — avoiding the custom-scheme iframe quirks some WebView versions have.

**Build (needs the Android SDK + `ANDROID_HOME`):**
```bash
npx cap open android       # or:
cd android && ./gradlew assembleDebug
```

A debug `app-debug.apk` was built and verified here (manifest contains the
`.deck` intent-filters). `variables.gradle` pins `compileSdkVersion = 36`
because this machine's `android-34` platform metadata fails to parse with the
bundled AGP (`Build properties not found for package Android SDK Platform 34` /
`unexpected element abis`). If your SDK has a parseable `android-34`, revert to
Capacitor's default of 34. Running needs an emulator/AVD or a device:
```bash
adb install app/build/outputs/apk/debug/app-debug.apk
```

---

## The import contract (shared by both platforms)

Native reads the opened file and exposes it to the shell:

```js
window.__OPENDECK_PENDING = { base64, filename, id };
window.__opendeckConsumePending?.();   // app.js defines this on boot
```

`app.js` consumes it (dedup by `id`) and runs the normal import pipeline
(fflate unzip → store). This works for **cold launch** (the global is already
set when boot runs) and **warm launch** (native calls the consumer). Native
polls cheaply for the consumer to exist, then injects the payload once.

## Verification checklist

- [x] `npm run dev` → shell shows the Welcome deck and presents it (web baseline).
- [x] `npm run build:sample` → `dist/welcome.deck`; re-imports in-browser.
- [x] iOS builds; [x] Mac Catalyst builds.
- [ ] Device run: AirDrop a `.deck` → it imports and appears in the library.
- [ ] Android run (needs SDK): share a `.deck` → imports; deck renders via the
      `decks.opendeck` origin.
- [ ] In a presented deck, `window.parent.Capacitor` is `undefined` (isolation).

## The `native/` folder

`native/` holds the original standalone templates and is kept as a reference
(e.g. if you wire a fresh project by hand). The **live** wiring is the actual
files under `ios/` and `android/` described above.
