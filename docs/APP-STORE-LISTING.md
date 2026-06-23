# App Store Listing — paste-ready metadata

Everything to fill the App Store Connect listing for **OpenDeck** (iOS + iPadOS +
macOS). Copy the fields straight in. Character counts are shown where Apple
imposes a limit; stay at or under.

> URLs (live):
> - Privacy Policy: `https://open-deck.org/privacy/`
> - Support: `https://open-deck.org/support/`
> - Marketing: `https://open-deck.org/`

---

## Core fields

| Field | Value |
|---|---|
| **App Name** (≤30) | `OpenDeck` |
| **Subtitle** (≤30) | `Open & present HTML decks` _(25)_ |
| **Primary category** | Productivity |
| **Secondary category** | Business _(optional)_ |
| **Copyright** | `© 2026 OpenDeck` |
| **Bundle ID** | `org.opendeck` |
| **SKU** | `opendeck-ios-001` _(any unique string; not shown publicly)_ |
| **Price** | Free |

### Subtitle alternatives (pick one, ≤30)
- `Open & present HTML decks` (25)
- `Your presentations, offline` (27)
- `A player for .deck files` (24)

---

## Promotional text (≤170, editable anytime without review)

```
Open and present .deck and HTML presentations on iPhone, iPad, and Mac. No account, no sign-in, fully offline — and nothing you open ever leaves your device.
```
_(159)_

---

## Description (≤4000)

```
OpenDeck is a clean, focused player for presentation "decks" — self-contained HTML presentations packaged as .deck files. Install it once, then open and present any deck you already have. No account, no sign-in, and no internet connection required.

WHY OPENDECK
A downloaded HTML presentation rarely behaves when you open it straight from the Files app — links break, fonts go missing, animations stall. OpenDeck gives every deck a proper home: each one renders the way its author intended, full-screen and offline, on iPhone, iPad, and Mac.

PRESENT ANYWHERE
• Tap to advance, swipe or use arrow keys to move between slides.
• Full-screen, distraction-free playback.
• Step-by-step reveals, tooltips, and baked-in narration all play exactly as built.
• The same deck looks and behaves identically across iPhone, iPad, and Mac.

YOUR LIBRARY
• Import decks from Files, AirDrop, or the share sheet.
• Everything is organized in one tidy library.
• A short welcome deck is included so you can see how it works on first launch.

PRIVATE BY DESIGN
• OpenDeck collects no data and makes no network requests.
• Everything you open stays on your device — there is no server to send it to.
• No analytics, no ads, no trackers.
• Each deck runs in an isolated, sandboxed view, kept separate from the rest of the app.

BEAUTIFUL & ACCESSIBLE
• Light, Dark, and Auto appearance that follows your system.
• Respects Dynamic Type, Reduce Transparency, Increase Contrast, and Reduce Motion.
• A quiet, type-led "paper" design that gets out of the way of your content.

MAKE YOUR OWN
Decks are an open format — a single HTML file plus a small manifest. Create them with the free OpenDeck skill for AI coding agents, or any tool that exports the format. Learn more at open-deck.org.

OpenDeck is open source and released under the MIT License.
```

---

## Keywords (≤100 chars total, comma-separated, no spaces after commas)

```
deck,presentation,slides,html,viewer,player,present,offline,slideshow,keynote,pitch,talk,reader
```
_(96)_

> Don't repeat the app name or category in keywords (Apple indexes those
> separately). Singular forms also match plurals.

---

## What's New (release notes for v1.0)

```
First release of OpenDeck — open and present your HTML decks on iPhone, iPad, and Mac. Fully offline and private by design.
```

---

## Age Rating questionnaire → **4+**

Answer **None / No** to every content question (no violence, no mature/suggestive
themes, no profanity, no simulated gambling, no contests, no user-generated
content shown to others, no unrestricted web access). OpenDeck only displays
documents the user themselves imports.

- Unrestricted web access: **No** (decks are local, sandboxed documents, not a browser).
- User-generated content / social: **No**.
- Result: **4+**.

---

## App Privacy ("nutrition label") → **Data Not Collected**

In App Store Connect → App Privacy:

1. "Do you or your third-party partners collect data from this app?" → **No, we do not collect data from this app.**
2. This yields the **Data Not Collected** label.
3. Privacy Policy URL: `https://open-deck.org/privacy/`

This is accurate: no network requests, no analytics/ads SDKs, on-device storage
only. Backed by `ios/App/App/PrivacyInfo.xcprivacy`.

---

## Export compliance

Already declared in `Info.plist`: `ITSAppUsesNonExemptEncryption = false`. In the
build's compliance prompt, answer **No** to "uses non-exempt encryption" — no
encryption documentation needed.

---

## App Review notes (paste into "Notes" for the reviewer)

```
OpenDeck is a viewer for self-contained HTML *documents* ("decks"), analogous to a PDF reader or a web browser opening a local page. Decks are content the user explicitly imports (via Files, AirDrop, or the share sheet) — they are not code downloaded to change the app's own features, and the app ships no in-app store or remote-content fetch.

Each deck renders inside a sandboxed, cross-origin iframe served from an isolated origin (a custom deck:// scheme on iOS/macOS). The sandbox withholds top-level navigation, so a deck can never replace or reach the app shell or the native bridge. The app's functionality is fixed; decks cannot alter it. (Ref: Guideline 2.5.2.)

To test: the app seeds a "Welcome" deck on first launch — open it from the library and tap/arrow through the slides. To test import, AirDrop or share any .deck file to the device and choose OpenDeck, or open one from the Files app.

The app collects no data and makes no network requests; everything is stored on-device.
```

### Demo / review account
Not applicable — no login or account.

---

## Field-by-field source map

| App Store Connect field | Where it comes from |
|---|---|
| Name / Subtitle / Promo / Description / Keywords / What's New | this file |
| Privacy Policy URL / Support URL / Marketing URL | this file (live on open-deck.org) |
| App Privacy label | this file → Data Not Collected |
| Age Rating | this file → 4+ |
| Review notes | this file |
| Screenshots | capture per `docs/APP-STORE-RELEASE-RUNBOOK.md` |
| Build | archive + upload per the runbook |
