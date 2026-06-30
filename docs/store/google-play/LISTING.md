# Google Play Listing — paste-ready metadata

Everything to fill the Play Console **Main store listing** for **OpenDeck** on
Android. Copy the fields straight in. Character counts are shown where Google
imposes a limit; stay at or under. Mirrors `docs/store/apple/LISTING.md` and
`docs/store/microsoft/LISTING.md`; the submission *checklist* lives in
[`SUBMISSION-CHECKLIST.md`](SUBMISSION-CHECKLIST.md).

> URLs (live):
> - Privacy Policy: `https://open-deck.org/privacy/`
> - Support: `https://open-deck.org/support/`
> - Website: `https://open-deck.org/`
> - Support email: `info@open-deck.org`

---

## Core fields

| Field | Value |
|---|---|
| **App name** (≤30) | `OpenDeck` |
| **Package name / Application ID** | `org.opendeck` |
| **Default language** | English (United States) – `en-US` |
| **App or game** | App |
| **Free or paid** | Free |
| **Category** | Productivity |
| **Tags** | Tools / Document management (pick the closest 2–3 in Console) |
| **Contact email** | `info@open-deck.org` |
| **Contact website** | `https://open-deck.org/` |

> The Application ID `org.opendeck` is permanent once the first bundle is
> uploaded — it can never be changed or reused. Matches `appId` in
> `capacitor.config.ts` and `android/app/build.gradle`.

---

## Short description (≤80)

```
Open & present HTML decks — fully offline, private, no account.
```
_(60)_

### Short description alternatives (pick one, ≤80)
- `Open & present HTML decks — fully offline, private, no account.` (60)
- `A clean, offline player for .deck and HTML presentations.` (56)
- `Present self-contained HTML decks. Offline, private, no sign-in.` (63)

---

## Full description (≤4000)

```
OpenDeck is a clean, focused player for presentation "decks" — self-contained HTML presentations packaged as .deck files. Install it once, then open and present any deck you already have. No account, no sign-in, and no internet connection required.

WHY OPENDECK
A downloaded HTML presentation rarely behaves when you open it straight from a file manager — links break, fonts go missing, animations stall. OpenDeck gives every deck a proper home: each one renders the way its author intended, full-screen and offline, on your phone or tablet.

PRESENT ANYWHERE
• Tap to advance, or swipe between slides.
• Full-screen, distraction-free playback.
• Step-by-step reveals, tooltips, and baked-in narration all play exactly as built.
• The same deck looks and behaves identically across phone, tablet, and desktop.

YOUR LIBRARY
• Import decks from your file manager, downloads, or the Android share sheet.
• Everything is organized in one tidy library.
• A short welcome deck and a few example decks are included so you can see how it works on first launch.

PRIVATE BY DESIGN
• OpenDeck collects no data and makes no network requests.
• Everything you open stays on your device — there is no server to send it to.
• No analytics, no ads, no trackers.
• Each deck runs in an isolated, sandboxed view, kept separate from the rest of the app.

BEAUTIFUL & ACCESSIBLE
• Light, Dark, and Auto appearance that follows your system.
• Respects your contrast and reduced-motion preferences.
• A quiet, type-led "paper" design that gets out of the way of your content.

MAKE YOUR OWN
Decks are an open format — a single HTML file plus a small manifest. Create them with the free OpenDeck skill for AI coding agents, or any tool that exports the format. Learn more at open-deck.org.

OpenDeck is open source.
```

---

## Graphic assets (in `docs/store/google-play/`)

| Play Console slot | Spec | File |
|---|---|---|
| **App icon** (required) | 512 × 512, 32-bit PNG, ≤1 MB | `store-images/icon-512.png` |
| **Feature graphic** (required) | 1024 × 500, PNG/JPG, no alpha | `store-images/feature-graphic-1024x500.png` |
| **Phone screenshots** (2–8 required) | 16:9 or 9:16, 320–3840 px per side | `screenshots/phone/01-library.png` … |
| **7-inch tablet** (optional, recommended) | up to 8 | `screenshots/tablet-7/01-library.png` … |
| **10-inch tablet** (optional, recommended) | up to 8 | `screenshots/tablet-10/01-library.png` … |

> Art is generated from `docs/assets/opendeck-icon.svg` (icon 512²) and the same
> OG-style paper template used for the Microsoft super-hero art (feature graphic
> 1024×500, wordmark-free). See [`screenshots/README.md`](screenshots/README.md)
> for how to capture the device screenshots.
>
> **No "macOS/iOS UI" trap exists on Play**, but keep the screenshots Android-native
> anyway (status bar, gesture nav) — mixed-OS chrome reads as careless and can
> draw a manual-review flag.

---

## What's new (release notes for v1.0, ≤500 per language)

```
First release of OpenDeck for Android — open and present your HTML decks, fully offline and private by design.
```

---

## Content rating (IARC questionnaire) → **Everyone / PEGI 3**

Category: **Reference, News, or Educational** → in practice answer **No** to every
content question:
- Violence / sexuality / profanity / controlled substances → **No**.
- User-generated / online interaction → **No** (decks are local files the user imports; no shared content, no chat).
- Shares user location → **No**.
- Digital purchases → **No**.
- Gambling / simulated gambling → **No**.

Result: lowest rating (**Everyone**, PEGI 3, USK 0), matching the Apple 4+ and
Microsoft "Everyone" passes. The rating is issued by IARC immediately after the
questionnaire.

---

## Data safety form → **No data collected, no data shared**

In Play Console → **Policy → App content → Data safety**:

1. "Does your app collect or share any of the required user data types?" → **No**.
2. "Is all of the user data collected by your app encrypted in transit?" →
   not applicable (no data leaves the device); answer per the form (you may still
   tick "encrypted in transit" truthfully — there is no transit).
3. "Do you provide a way for users to request that their data is deleted?" →
   not applicable (no data collected); the form lets you skip when nothing is collected.
4. Privacy Policy URL: `https://open-deck.org/privacy/`.

This is accurate: no network requests, no analytics/ads SDKs, on-device storage
only (Capacitor Filesystem / WebView IndexedDB).

> The app declares `android.permission.INTERNET` in the manifest (Capacitor's
> WebView requires it to load the bundled `www/` over `https://localhost`). This
> permission does **not** by itself mean data is collected — no outbound request
> is ever made. If asked in review, point to the certification notes in
> [`REVIEW-NOTES.md`](REVIEW-NOTES.md).

---

## Ads, target audience, and other declarations

| App content section | Answer |
|---|---|
| **Ads** | Contains no ads → **No**. |
| **Target audience & content** | Target age 13+ (general audience; not directed at children). Avoids the Designed-for-Families / Teacher-Approved program obligations. |
| **News app** | **No**. |
| **COVID-19 contact tracing/status** | **No**. |
| **Data safety** | No data collected/shared (above). |
| **Government app** | **No**. |
| **Financial features** | **No**. |
| **Health** | **No**. |

---

## Store settings

| Field | Value |
|---|---|
| **App category** | Productivity |
| **Email** | `info@open-deck.org` |
| **Website** | `https://open-deck.org/` |
| **Phone** | _(optional — leave blank)_ |
| **External marketing** | leave default (allowed) |

---

## Field-by-field source map

| Play Console field | Where it comes from |
|---|---|
| App name / Short & Full description / What's new | this file |
| Privacy Policy URL / Support email / Website | this file (live on open-deck.org) |
| Data safety | this file → No data collected/shared |
| Content rating | this file → IARC questionnaire → Everyone |
| Graphic assets (icon / feature / screenshots) | `docs/store/google-play/` (this file's asset table) |
| App bundle (`.aab`) | build + upload per [`RELEASE-RUNBOOK.md`](RELEASE-RUNBOOK.md) |
| Reviewer / certification notes | [`REVIEW-NOTES.md`](REVIEW-NOTES.md) |
