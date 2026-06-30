# Release Runbook — build, sign & submit (Android)

Step-by-step to get OpenDeck from this repo into Google Play. Everything here
runs on **your Mac** with the Android SDK + JDK 17 installed (Android Studio
provides both). Listing text and questionnaire answers come from
[`LISTING.md`](LISTING.md); policy framing from [`REVIEW-NOTES.md`](REVIEW-NOTES.md).

OpenDeck is one Capacitor Android project shipping a single **Android App Bundle
(`.aab`)** to one Play record (`org.opendeck`). Play serves the right density/ABI
split to each device from that bundle.

---

## 0. Prerequisites (once)

- [ ] **Google Play Developer account** ($25 one-time) with identity verification done.
- [ ] **Closed-testing 14-day gate** planned if this is a personal account
      (≥12 testers, 14 continuous days — see [`REVIEW-NOTES.md`](REVIEW-NOTES.md)).
- [ ] **JDK 17** and the **Android SDK** installed (`ANDROID_HOME` / `sdk.dir` in
      `android/local.properties`).
- [ ] Android Studio installed (for the signed-bundle wizard and Logcat).

---

## 1. Sync the web shell into the native project

The native app embeds `www/`. Rebuild and copy it in before building:

```bash
cd /Volumes/Apps/dev/opendeck-app
npm install            # ensure fonts/fflate vendored
npm run dist:collect   # if this is how www is staged (see scripts/collect-dist.sh)
npx cap sync android   # copies www/ into android/app/src/main/assets/public
```

> A stale `www` is the classic "my change isn't in the build" trap — follow any
> warning `dist:collect` prints.

Sanity check the manifest + icons made it in:

```bash
ls android/app/src/main/assets/public/index.html
ls android/app/src/main/res/mipmap-anydpi-v26/ic_launcher.xml
```

---

## 2. Set the version

In `android/app/build.gradle` → `defaultConfig`:

- **`versionName`** (`"1.0"`) — the public version string shown to users.
- **`versionCode`** (`1`) — an integer that **must increase for every upload**,
  even rejected ones. Bump it before each new bundle.

```
versionCode 1        // → 2, 3, … on each subsequent upload
versionName "1.0"    // → "1.0.1" when you ship a new public release
```

> Keep `versionName` aligned with `package.json` (`1.0.0`) for sanity.

---

## 3. Create the signing (upload) key — once

Play uses **Play App Signing**: Google holds the *app signing key*; you sign
uploads with an **upload key** you generate and keep. Generate it once:

```bash
keytool -genkey -v \
  -keystore ~/keystores/opendeck-upload.jks \
  -alias opendeck-upload \
  -keyalg RSA -keysize 2048 -validity 10000
```

Store the keystore + passwords in a password manager — **losing the upload key
is recoverable** (Google can reset it), but losing it stalls releases. Never
commit the `.jks` or passwords to the repo.

There is currently **no `signingConfig` in `android/app/build.gradle`** — choose
one of:

**A. Sign via Android Studio wizard (simplest).** Skip gradle config; sign in §4.

**B. Wire gradle signing (for CI / `gradlew`).** Add to `android/app/build.gradle`
and keep secrets in `~/.gradle/gradle.properties` (outside the repo):

```gradle
android {
    signingConfigs {
        release {
            storeFile file(System.getenv("OPENDECK_KEYSTORE") ?: "${System.properties['user.home']}/keystores/opendeck-upload.jks")
            storePassword System.getenv("OPENDECK_STORE_PW")
            keyAlias "opendeck-upload"
            keyPassword System.getenv("OPENDECK_KEY_PW")
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            // minifyEnabled stays false (current setting) — see note below
        }
    }
}
```

---

## 4. Build the signed App Bundle (`.aab`)

**Via Android Studio (recommended for the first release):**

```bash
npm run open:android      # opens android/ in Android Studio
```

1. **Build → Generate Signed App Bundle / APK → Android App Bundle.**
2. Select the keystore from §3 (`opendeck-upload.jks`), enter passwords.
3. Build variant **release** → Finish.
4. Output: `android/app/release/app-release.aab`.

**Via CLI (if gradle signing wired per §3-B):**

```bash
cd android
./gradlew bundleRelease
# → android/app/build/outputs/bundle/release/app-release.aab
```

> First release: keep `minifyEnabled false` (current setting) to avoid ProGuard
> stripping anything the WebView bridge reflects on. Revisit R8/shrinking later
> with a tested `proguard-rules.pro`.

---

## 5. Create the Play Console app record

Play Console → **Create app**:

- App name: `OpenDeck` · Default language: English (US) · App · Free.
- Confirm the Developer Program Policies + US export law declarations.
- The package name `org.opendeck` is set by the first uploaded bundle and is
  then permanent.

---

## 6. Enroll in Play App Signing & upload the first bundle

1. Create a release on a track (start with **Closed testing** if gated — §0).
2. **Play App Signing**: accept "Let Google manage your app signing key"
   (default). Your §3 key becomes the **upload key**.
3. Upload `app-release.aab`. Resolve any pre-launch warnings.

---

## 7. Complete the App content forms (one-time, paste from LISTING.md)

Play Console → **Policy → App content**:

- [ ] Privacy policy URL `https://open-deck.org/privacy/`.
- [ ] **Data safety** → No data collected/shared.
- [ ] **Content rating** → IARC questionnaire → Everyone.
- [ ] **Target audience** → 13+.
- [ ] Ads → No · Government/financial/health/news → No.

---

## 8. Capture screenshots & upload graphics

Required graphics (specs + how-to in [`screenshots/README.md`](screenshots/README.md)):

| Asset | Spec | Min |
|---|---|---|
| App icon | 512 × 512 PNG | required |
| Feature graphic | 1024 × 500 PNG/JPG | required |
| Phone screenshots | 9:16 portrait, 320–3840 px | **2 min** |
| 7" / 10" tablet | up to 8 each | recommended |

Good shots: the **library** (welcome + 3 example decks), a **slide
mid-presentation**, **Settings** (appearance / privacy / version). Light mode;
dark optional.

---

## 9. Fill the Main store listing

Play Console → **Grow → Store presence → Main store listing**, paste from
[`LISTING.md`](LISTING.md):

- [ ] App name, short description, full description.
- [ ] App icon, feature graphic, screenshots (phone + tablet).
- [ ] Category Productivity; contact email + website.

Set **What's new** in the release notes of the release itself (§10).

---

## 10. Roll out

- **Personal account, still gated:** push the **Closed testing** release, run the
  14-day / ≥12-tester test, then **apply for production access** and promote.
- **Ungated:** create a **Production** release, add the What's new text, set
  rollout to 100% (or staged), and **Send for review**.

Review typically takes a few hours to a few days for a first submission. Watch
the Console **Publishing overview** and email.

---

## Re-upload checklist (after any change)

1. `npx cap sync android` (if `www/` changed).
2. Bump `versionCode` in `android/app/build.gradle` (required).
3. Rebuild the signed `.aab` (§4).
4. Create a new release on the track → upload → review/submit.

---

## Common rejection / hold causes (pre-empted here)

| Cause | Status |
|---|---|
| Target API too low | ⚠️ verify; bump `targetSdkVersion` from 34 if Play requires 35 (§ REVIEW-NOTES) |
| Missing privacy policy / Data safety mismatch | ✅ truly no data/network; URL live |
| Closed-testing gate not met (new personal accounts) | ⚠️ plan 14 days / ≥12 testers |
| Dynamic code loading concern | ✅ framed in REVIEW-NOTES (sandboxed doc viewer) |
| Unsigned / duplicate `versionCode` | ⚠️ sign + bump every upload (§2–4) |
| Excess permissions | ✅ INTERNET only; no storage/location/camera |
| Broken `.deck` import | ✅ intent filters wired (VIEW + SEND); test before submit |
