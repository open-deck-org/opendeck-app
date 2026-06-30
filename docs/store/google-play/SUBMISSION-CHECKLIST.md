# Google Play — Submission Checklist (progress tracker)

The master progress tracker for getting **OpenDeck** onto Google Play. Tick boxes
as you go. Details for each step live in the sibling docs:
[`LISTING.md`](LISTING.md) · [`REVIEW-NOTES.md`](REVIEW-NOTES.md) ·
[`RELEASE-RUNBOOK.md`](RELEASE-RUNBOOK.md) · [`screenshots/README.md`](screenshots/README.md).

**Status:** _not started_ · Target version: `1.0` (versionCode `1`) · App ID: `org.opendeck`

---

## A. Account & program prerequisites

- [ ] Google Play Developer account active ($25 one-time).
- [ ] Identity verification complete (legal name/address; D-U-N-S if organization).
- [ ] Account type known: **personal** (14-day closed-test gate applies) or **organization** (no gate).
- [ ] If personal: plan for **≥12 testers, 14 continuous days** of closed testing before Production unlocks.

## B. Build readiness (this repo)

- [ ] `npm run dist:collect && npx cap sync android` — `www/` synced into the bundle.
- [ ] `versionCode` / `versionName` set in `android/app/build.gradle` (bump `versionCode` every upload).
- [ ] **Target API verified** — bump `targetSdkVersion` from `34` in `android/variables.gradle` if Play requires API 35 (or higher). ⚠️
- [ ] Upload keystore generated (`opendeck-upload.jks`) and backed up in a password manager.
- [ ] Signing wired (Android Studio wizard, or gradle `signingConfig` per runbook §3).
- [ ] Signed `app-release.aab` built.
- [ ] Smoke-tested on a phone **and** a tablet, light + dark.
- [ ] `.deck` open (VIEW intent) and share-sheet import (SEND intent) verified.
- [ ] Confirmed zero outbound network requests (proxy / Network Inspector).

## C. Play Console — App content (Policy)

- [ ] Privacy policy URL `https://open-deck.org/privacy/`.
- [ ] **Data safety** → No data collected / shared.
- [ ] **Content rating** → IARC questionnaire → Everyone.
- [ ] **Target audience** → 13+ (not child-directed).
- [ ] Ads → No.
- [ ] Government / financial / health / news / COVID → all No.

## D. Store listing

- [ ] App name `OpenDeck`.
- [ ] Short description (≤80) — from [`LISTING.md`](LISTING.md).
- [ ] Full description (≤4000) — from [`LISTING.md`](LISTING.md).
- [ ] App icon **512 × 512** uploaded.
- [ ] Feature graphic **1024 × 500** uploaded.
- [ ] Phone screenshots (**≥2**) uploaded.
- [ ] 7" + 10" tablet screenshots uploaded (recommended).
- [ ] Category **Productivity**; contact email + website set.
- [ ] **What's new** text added to the release.

## E. Release & rollout

- [ ] Play App Signing enrolled; first `.aab` uploaded.
- [ ] Pre-launch report reviewed (no blocking issues).
- [ ] **Personal/gated:** closed-test 14-day run complete → production access granted.
- [ ] Production release created → **Sent for review**.
- [ ] Approved & live (or staged rollout %).

---

## Known gotchas (Android-specific, vs. Apple/Microsoft)

| Gotcha | Note |
|---|---|
| 14-day closed-testing gate | New **personal** accounts only; budget the time. No equivalent on Apple/Microsoft. |
| Target API requirement | Project is at `targetSdk 34`; Play likely requires 35 for new apps — verify & bump. |
| `versionCode` must increase | Integer, every upload — like Apple's build number. |
| Permanent package name | `org.opendeck` is locked by the first uploaded bundle. |
| Upload key vs app signing key | Google holds the app signing key; you keep the upload key. Losing the upload key is recoverable. |
| INTERNET permission | Declared (Capacitor WebView needs it); no data is sent — note ready in [`REVIEW-NOTES.md`](REVIEW-NOTES.md) if queried. |
