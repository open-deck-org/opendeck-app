# App store submissions

All store-submission material for OpenDeck, organized by **store → asset type →
device/model**. Each store owns its own screenshots so platform-specific images
are never reused across stores (reusing macOS screenshots in the Microsoft
listing caused a `10.1.1.3` certification failure — see
[`microsoft/screenshots/desktop/README.md`](microsoft/screenshots/desktop/README.md)).

Brand source (master app icons) lives in [`../assets/`](../assets/), not here —
the listings reference it to generate store art.

## Layout

```
store/
  apple/
    LISTING.md            paste-ready App Store Connect metadata (iOS + iPadOS + macOS)
    REVIEW-NOTES.md       HIG / App Review notes, 2.5.2 framing, privacy label
    RELEASE-RUNBOOK.md    Xcode archive & submit steps
    screenshots/
      iphone-6.9/  ipad-13/  mac/
  microsoft/
    LISTING.md            paste-ready Partner Center metadata (Windows, PWA → MSIX)
    screenshots/
      desktop/            Windows-native captures (must not show macOS/iOS UI)
    store-images/         poster / box / app-tile / super-hero art
  google-play/
    LISTING.md            paste-ready Play Console metadata (Android, Capacitor → AAB)
    REVIEW-NOTES.md       Play policy notes, Data safety, target-API & closed-test gates
    RELEASE-RUNBOOK.md    build / sign (.aab) / upload steps
    SUBMISSION-CHECKLIST.md  master progress tracker
    screenshots/
      phone/  tablet-7/  tablet-10/   Android-native captures
    store-images/         icon-512 / feature-graphic 1024×500
```

## Status

| Store | State |
|---|---|
| Apple App Store | submitted |
| Microsoft Store | failed cert `10.1.1.3` — re-capturing Desktop screenshots on Windows, then resubmit |
| Google Play | not started — docs prepared (`google-play/`); next: build signed `.aab`, capture screenshots, run closed-test gate |
