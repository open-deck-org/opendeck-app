#!/usr/bin/env bash
# Collects the latest per-platform build outputs into dist/ so all artifacts
# live in one obvious place:
#
#   dist/android/OpenDeck-debug.apk      (gradle debug APK)
#   dist/macos/OpenDeck.app              (Mac Catalyst, double-click to run)
#   dist/ios/OpenDeck-simulator.app      (iOS Simulator build)
#   dist/welcome.deck                     (sample package, from build:sample)
#
# Run AFTER building each platform (see docs/BUILDING.md). Missing builds are
# skipped, not errors.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p dist/ios dist/macos dist/android

# build/mac first: it holds the ad-hoc *signed* Catalyst app from BUILDING.md's
# run command; DerivedData may also hold a signing-disabled (unrunnable) build.
DERIVED_DIRS=("$ROOT/build/mac/Build/Products" "$HOME/Library/Developer/Xcode/DerivedData" "/Volumes/Apps/XcodeDerivedData")

find_app() { # $1 = product subdir glob suffix
  for d in "${DERIVED_DIRS[@]}"; do
    [ -d "$d" ] || continue
    local hit
    hit=$(find "$d" -maxdepth 6 -path "*$1/App.app" -type d 2>/dev/null | head -1)
    [ -n "$hit" ] && { echo "$hit"; return; }
  done
}

# Android debug APK
APK="android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK" ]; then cp -f "$APK" dist/android/OpenDeck-debug.apk; echo "android   -> dist/android/OpenDeck-debug.apk"; else echo "android   - skipped (build: cd android && ./gradlew assembleDebug)"; fi

# macOS Catalyst app (prefer the ad-hoc signed local build/mac)
MAC=$(find_app "Debug-maccatalyst")
if [ -n "${MAC:-}" ]; then rm -rf dist/macos/OpenDeck.app; cp -R "$MAC" dist/macos/OpenDeck.app; echo "macos     -> dist/macos/OpenDeck.app"; else echo "macos     - skipped (see docs/BUILDING.md § macOS)"; fi

# iOS simulator app
IOS=$(find_app "Debug-iphonesimulator")
if [ -n "${IOS:-}" ]; then rm -rf dist/ios/OpenDeck-simulator.app; cp -R "$IOS" dist/ios/OpenDeck-simulator.app; echo "ios(sim)  -> dist/ios/OpenDeck-simulator.app"; else echo "ios       - skipped (see docs/BUILDING.md § iOS)"; fi

echo "collected into $ROOT/dist/"
