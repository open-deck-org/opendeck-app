# Release Runbook — archive & submit (iOS + iPad + Mac)

Step-by-step to get OpenDeck from this repo into the App Store. Everything here
runs on **your Mac** with Xcode signed into the Apple Developer account (team
`VX92BPRWZ8`). Listing text and questionnaire answers come from
`docs/store/apple/LISTING.md`.

OpenDeck is one Xcode target shipping to **two platforms** under one App Store
Connect record: **iOS/iPadOS** and **macOS (Mac Catalyst)**. You archive and
upload each platform separately, then attach both builds to the version.

---

## 0. Prerequisites (once)

- [ ] **Apple Developer Program** membership active (paid, $99/yr).
- [ ] Xcode signed in: Settings → Accounts → your Apple ID → team `VX92BPRWZ8`.
- [ ] Automatic signing is on (it is, in `project.pbxproj`) — Xcode creates the
      Distribution certificate and App Store provisioning profiles on first archive.

---

## 1. Sync the web shell into the native projects

The native apps embed `www/`. Rebuild and copy it in before archiving:

```bash
cd /Volumes/Apps/dev/opendeck-app
npm install            # ensure fonts/fflate vendored
npm run dist:collect   # if this is how www is staged (see scripts/collect-dist.sh)
npx cap sync ios       # copies www/ into ios/App/App/public + updates pods
```

> If `dist:collect` warns about a stale build, follow its message — a stale `www`
> is the classic "my change isn't in the build" trap.

Sanity check that the privacy manifest and icons made it in:

```bash
ls ios/App/App/PrivacyInfo.xcprivacy
ls ios/App/App/Assets.xcassets/AppIcon.appiconset/   # light + dark + tinted PNGs
```

---

## 2. Set the version & build number

- **Marketing version** (`CFBundleShortVersionString`) = `1.0` — the public version.
- **Build number** (`CFBundleVersion`) = `1` for the first upload; it **must
  increase for every subsequent upload**, even rejected ones.

Bump the build number from the command line before each archive:

```bash
cd ios/App
xcrun agvtool next-version -all      # increments CURRENT_PROJECT_VERSION
# or set explicitly:  xcrun agvtool new-version -all 2
```

(Marketing version only changes when you ship a new public release:
`xcrun agvtool new-marketing-version 1.0.1`.)

---

## 3. Open the workspace

```bash
npm run open:ios       # opens ios/App/App.xcworkspace in Xcode
```

Always the **.xcworkspace**, never the .xcodeproj (CocoaPods).

---

## 4. Register the App ID & create the App Store Connect record

1. With automatic signing, archiving the first time registers the App ID
   `org.opendeck` automatically. (Or pre-create it at
   developer.apple.com → Identifiers.)
2. App Store Connect → **My Apps → + → New App**:
   - Platforms: tick **iOS** and **macOS**.
   - Name: `OpenDeck` · Primary language: English · Bundle ID: `org.opendeck` · SKU: `opendeck-ios-001`.
3. This single record now has an **iOS** and a **macOS** tab — you'll attach a
   build to each.

---

## 5. Archive & upload the iOS/iPadOS build

1. In Xcode, set the run destination to **Any iOS Device (arm64)** (not a
   simulator — archiving is disabled for simulators).
2. **Product → Archive**. Wait for the build.
3. In the **Organizer** that opens: select the archive → **Distribute App** →
   **App Store Connect** → **Upload** → keep defaults (Automatic signing,
   include symbols) → **Upload**.
4. Export-compliance prompt: **No** (non-exempt encryption) — already declared
   in `Info.plist`.

---

## 6. Archive & upload the Mac (Catalyst) build

1. Change the run destination to **My Mac (Mac Catalyst)**.
2. **Product → Archive** again — this produces a separate macOS archive.
3. Organizer → **Distribute App → App Store Connect → Upload**.

> If the Mac destination isn't offered: target → **General → Supported
> Destinations** must include **Mac (Mac Catalyst)** (the project already has
> `SUPPORTS_MACCATALYST = YES`).

---

## 7. Wait for processing

Both builds appear under App Store Connect → your app → **TestFlight** (or the
version's Build section) after 5–30 min of processing. You'll get an email if a
build is rejected at processing (e.g. missing privacy manifest — already
handled).

---

## 8. Capture screenshots

Required sizes (portrait). Up to 10 per display; minimum 1. Use the simulator
(`⌘S` to save a screenshot) or a device.

| Listing | Required size (px) | Device to use |
|---|---|---|
| iPhone 6.9" | **1320 × 2868** | iPhone 16 Pro Max simulator |
| iPad 13" | **2064 × 2752** | iPad Pro 13" (M4) simulator |
| Mac | **1280 × 800** (or 1440×900 / 2560×1600) | screenshot the running Mac app |

Good shots to take: the **library** (with the welcome deck), a **slide
mid-presentation**, **full-screen playback**, and the **import / share** flow.
Capture each in light mode (dark optional).

---

## 9. Fill the version metadata

On both the **iOS** and **macOS** version pages, paste from
`docs/store/apple/LISTING.md`:

- [ ] Name, Subtitle, Promotional text, Description, Keywords, What's New.
- [ ] Support URL `https://open-deck.org/support/`, Marketing URL `https://open-deck.org/`.
- [ ] Privacy Policy URL `https://open-deck.org/privacy/`.
- [ ] Upload screenshots per platform (§8).
- [ ] **Build**: select the uploaded build for that platform.
- [ ] **App Privacy** → Data Not Collected (set once, applies to the app).
- [ ] **Age Rating** → answer all None → 4+.
- [ ] **App Review Information** → paste the reviewer notes; no demo account.
- [ ] Pricing → Free; Availability → all territories (or your choice).

---

## 10. Submit

- [ ] Click **Add for Review / Submit** on the iOS version.
- [ ] Repeat on the macOS version.
- [ ] Choose manual or automatic release after approval.

Review typically takes 24–48h. Watch email + the app's status.

---

## Re-upload checklist (after any change)

1. `npx cap sync ios` (if `www/` changed).
2. `xcrun agvtool next-version -all` (bump build number — required).
3. Re-archive the changed platform(s) → upload.
4. Select the new build on the version page → resubmit.

---

## Common rejection causes (pre-empted here)

| Cause | Status |
|---|---|
| Missing privacy manifest | ✅ `PrivacyInfo.xcprivacy` present |
| 2.5.2 "downloads executable code" | ✅ framed in review notes (sandboxed doc viewer) |
| Icon has alpha / wrong size | ✅ 1024² opaque, validated with `actool` |
| Privacy label mismatch | ✅ truly no data/network |
| Duplicate build number | ⚠️ bump every upload (§2) |
| Thin app (4.2) | ✅ library/import/settings + welcome deck on first run |
