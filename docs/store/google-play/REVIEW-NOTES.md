# Google Play — Policy & Review Notes

Paste-ready certification notes and a pre-submission policy checklist for
OpenDeck on Android. Reflects 2025–2026 Play Console policy (Data safety,
target-API requirement, closed-testing gate for new personal accounts).

The Android shell is served from `www/` over `https://localhost` (Capacitor's
WebView). Decks render from a **separate origin** (a `WebViewAssetLoader` on a
distinct host) so untrusted deck JS can never reach the Capacitor bridge — the
same isolation model documented in `docs/NATIVE-INTEGRATION.md` and mirrored on
iOS/macOS (`deck://`).

---

## ⚠️ New personal developer accounts: the 14-day closed-testing gate

Google requires **personal** developer accounts created after **Nov 2023** to
run a **closed test with at least 12 testers, opted in for 14 continuous days**,
before the **Production** track unlocks. This is the single biggest schedule
risk — there is no way to skip it.

- [ ] Confirm whether the developer account is **personal** (gated) or
      **organization** (not gated, but needs D-U-N-S verification).
- [ ] If gated: create a **Closed testing** release, recruit ≥12 testers (email
      list or Google Group), keep them opted in for 14 days, then apply for
      production access.
- [ ] Budget the 14 days into the release timeline.

> If this is an organization account, this gate does not apply — but identity
> verification (legal name, address, D-U-N-S) must be complete first.

---

## ⚠️ Target API level requirement

Google requires **new apps and updates to target a recent API level** (the
window is "current API − 1", enforced ~Aug 31 each year).

- Current project: `targetSdkVersion = 34` (`android/variables.gradle`),
  `compileSdkVersion = 36`, `minSdkVersion = 22`.
- [ ] **Verify the live requirement before building.** As of the 2025 cycle new
      submissions must target **API 35 (Android 15)**. If Play rejects the
      bundle for target API, bump `targetSdkVersion` to the required level in
      `variables.gradle`, re-`cap sync android`, retest, and rebuild.

> `compileSdk 36` is intentional (the local SDK's android-34 metadata fails to
> parse with this AGP — see `docs/NATIVE-INTEGRATION.md`). Runtime behavior is
> governed by `targetSdk`, so raising only `targetSdkVersion` is the safe change.

---

## "Decks run user HTML/JS" — the dynamic-code concern

Apple frames this under Guideline 2.5.2. Google's analogous policy is
**Device and Network Abuse** (interpreted languages / dynamic code) and
**Deceptive Behavior**. Play is more permissive than Apple here, but the framing
is the same and goes in the certification notes:

> OpenDeck is a viewer for self-contained HTML *documents* ("decks"), analogous
> to a PDF reader or a browser opening a local page. Decks are **content the
> user explicitly imports** (file manager, downloads, share sheet) — not code
> that changes the app's own features, and the app ships no in-app store or
> remote-content fetch. Each deck renders inside a **sandboxed, cross-origin
> WebView origin** (a `WebViewAssetLoader` host distinct from the app shell),
> with top-level navigation withheld, so a deck can never replace or reach the
> shell or the Capacitor bridge.

Do **not** add any feature that fetches remote decks automatically or executes
code that changes the app itself — keep import user-initiated.

---

## Permissions audit (minimal)

`android/app/src/main/AndroidManifest.xml` declares exactly one permission:

- `android.permission.INTERNET` — required by Capacitor's WebView to serve the
  bundled `www/` over `https://localhost`. **No outbound network request is ever
  made.** No `READ/WRITE_EXTERNAL_STORAGE`, no location, no camera, no contacts.

Import is handled via intent filters (no storage permission needed):
- `VIEW` on `application/x-deck` (content/file schemes) — strong association.
- `VIEW` on `*/*` with `pathPattern .*\.deck` — extension fallback.
- `SEND` on `application/x-deck` and `application/zip` — share-sheet receive.

If a reviewer questions `INTERNET`, the answer: it is the standard Capacitor
WebView requirement; the deck sandbox CSP (`connect-src 'self'`) blocks network
calls, and the app collects no data.

---

## Accessibility — done (same engine as iOS/Mac)

- [x] `prefers-reduced-motion` / contrast honored in the web shell.
- [x] No `maximum-scale`/`user-scalable=no` → system font scaling works.
- [x] Touch targets ≥ 48dp.
- [x] Hardware/gesture **Back** steps out layer by layer, then exits (wired in `app.js`).
- [x] Visible focus rings, `aria-label`s, `role="dialog"`/`aria-modal`, `aria-live` status.

## App icon — adaptive, done

Adaptive launcher icon ships foreground + background:
- `mipmap-anydpi-v26/ic_launcher.xml` → `@mipmap/ic_launcher_foreground` over
  `@color/ic_launcher_background` (`#FAFAF8`, the paper background).
- Per-density `ic_launcher_foreground.png` (mdpi…xxxhdpi) + round variants.

The **512×512 hi-res store icon** is a separate Play Console asset (see
[`LISTING.md`](LISTING.md) graphic-assets table), not the launcher icon.

---

## Pre-submission policy checklist

Account / program:
- [ ] Developer account active ($25 one-time) and identity verification complete.
- [ ] Closed-testing 14-day gate satisfied (personal accounts — see top of file).

App content (Play Console → Policy → App content):
- [ ] **Privacy policy** URL set: `https://open-deck.org/privacy/`.
- [ ] **Data safety** → No data collected / shared.
- [ ] **Ads** → No ads.
- [ ] **Content rating** questionnaire completed → Everyone.
- [ ] **Target audience** → 13+ (not child-directed).
- [ ] **Government / financial / health / news** → all No.

Build / technical:
- [ ] Bundle targets the required API level (verify; bump from 34 if needed).
- [ ] Signed **`.aab`** uploaded; Play App Signing enrolled.
- [ ] `versionCode` increases on every upload.
- [ ] Run on a phone + a tablet in light + dark; verify `.deck` open + share import.
- [ ] Confirm zero outbound network requests (proxy / `Network Inspector`).

Store listing:
- [ ] Name, short & full description, what's new (from [`LISTING.md`](LISTING.md)).
- [ ] App icon 512², feature graphic 1024×500, ≥2 phone screenshots, tablet screenshots.
- [ ] Category Productivity; contact email + website.

---

## Submission scope

One Capacitor Android project → one Play app record (`org.opendeck`). Phones and
tablets are served by the same bundle; tablet screenshots are optional but
recommended so the listing shows the responsive grid. No Wear/TV/Auto/Chromebook
form factors targeted (default device catalog is fine).
