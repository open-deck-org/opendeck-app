# Google Play — Submission Checklist (progress tracker)

The master progress tracker for getting **OpenDeck** onto Google Play. Tick boxes
as you go. Details for each step live in the sibling docs:
[`LISTING.md`](LISTING.md) · [`REVIEW-NOTES.md`](REVIEW-NOTES.md) ·
[`RELEASE-RUNBOOK.md`](RELEASE-RUNBOOK.md) · [`screenshots/README.md`](screenshots/README.md).

**Status:** _account created_ — owning Gmail `opendeckorg@gmail.com` ready; assets (icon, feature graphic, 3 phone screenshots) prepared. Next: register the Play developer account ($25 + ID), then build the signed `.aab`. Target version: `1.0` (versionCode `1`) · App ID: `org.opendeck`

---

## A. Account & program prerequisites

> **Decided:** owning Google account = **`opendeckorg@gmail.com`** (dedicated project Gmail, 2FA on). Play account type = **Personal** (OpenDeck is not a legal entity). Public developer name = **OpenDeck**; public contact email = **`info@open-deck.org`**.
> The old **`iRetro`** account on `s.djukic@gmail.com` was **closed for inactivity and is NOT reactivatable** — so the pre-Nov-2023 testing exemption is unavailable, and the **12-tester / 14-day closed-test gate applies**.

- [x] Owning account created (`opendeckorg@gmail.com`, 2-Step Verification on).
- [ ] Google Play Developer account registered & active ($25 one-time).
- [ ] Identity verification complete (legal name/address; photo ID for personal).
- [ ] Developer name set to `OpenDeck`; contact email set to `info@open-deck.org`.
- [ ] **≥12 testers** lined up (reciprocal testing community) for the 14-day closed test.

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
- [ ] App icon **512 × 512** uploaded. _(file ready: `store-images/icon-512.png`)_
- [ ] Feature graphic **1024 × 500** uploaded. _(file ready: `store-images/feature-graphic-1024x500.png`)_
- [ ] Phone screenshots (**≥2**) uploaded. _(3 files ready in `screenshots/phone/`)_
- [ ] ~~7" + 10" tablet screenshots~~ — **deferred to a post-v1.0 listing update** (optional on Play; emulator cold-boot blocked capture — see [`screenshots/README.md`](screenshots/README.md)).
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
