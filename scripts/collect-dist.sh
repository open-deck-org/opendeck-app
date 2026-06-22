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
#
# Staleness guard: each collected app is reported with its build time, and we
# warn loudly if it predates the icon/web sources it should have been built
# from. This catches the silent trap where a candidate dir (e.g. build/mac)
# still holds an OLD build and gets copied as if it were current.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"
mkdir -p dist/ios dist/macos dist/android

# build/mac first: it holds the ad-hoc *signed* Catalyst app from BUILDING.md's
# run command; DerivedData may also hold a signing-disabled (unrunnable) build.
DERIVED_DIRS=("$ROOT/build/mac/Build/Products" "$HOME/Library/Developer/Xcode/DerivedData" "/Volumes/Apps/XcodeDerivedData")

# Newest source input the app should reflect (app icons + web assets). If a
# collected build's executable is older than this, the build is stale.
SRC_DIRS=(ios/App/App/Assets.xcassets www)
newest_src_mtime=0
for d in "${SRC_DIRS[@]}"; do
  [ -d "$d" ] || continue
  m=$(find "$d" -type f -exec stat -f '%m' {} + 2>/dev/null | sort -rn | head -1)
  [ -n "$m" ] && [ "$m" -gt "$newest_src_mtime" ] && newest_src_mtime=$m
done

find_app() { # $1 = product subdir glob suffix
  for d in "${DERIVED_DIRS[@]}"; do
    [ -d "$d" ] || continue
    local hit
    hit=$(find "$d" -maxdepth 6 -path "*$1/App.app" -type d 2>/dev/null | head -1)
    [ -n "$hit" ] && { echo "$hit"; return; }
  done
}

# stale_check <app-bundle> <executable-subpath>  -> prints source/age, warns if stale
stale_check() {
  local app="$1"
  local exe="$app/$2"
  [ -f "$exe" ] || exe="$app"
  local bm; bm=$(stat -f '%m' "$exe" 2>/dev/null || echo 0)
  echo "             from: $1  (built $(stat -f '%Sm' -t '%Y-%m-%d %H:%M' "$exe" 2>/dev/null))"
  if [ "$newest_src_mtime" -gt 0 ] && [ "$bm" -lt "$newest_src_mtime" ]; then
    echo "  ⚠️  WARNING: this build is OLDER than your icon/web sources — it is STALE."
    echo "      Rebuild this platform before collecting (see docs/BUILDING.md), then re-run."
  fi
}

# Android debug APK
APK="android/app/build/outputs/apk/debug/app-debug.apk"
if [ -f "$APK" ]; then
  cp -f "$APK" dist/android/OpenDeck-debug.apk; echo "android   -> dist/android/OpenDeck-debug.apk"
  am=$(stat -f '%m' "$APK" 2>/dev/null || echo 0)
  echo "             from: $APK  (built $(stat -f '%Sm' -t '%Y-%m-%d %H:%M' "$APK" 2>/dev/null))"
  if [ "$newest_src_mtime" -gt 0 ] && [ "$am" -lt "$newest_src_mtime" ]; then
    echo "  ⚠️  WARNING: APK is OLDER than your icon/web sources — it is STALE. Rebuild & re-run."
  fi
else
  echo "android   - skipped (build: cd android && ./gradlew assembleDebug)"
fi

# macOS Catalyst app (prefer the ad-hoc signed local build/mac)
MAC=$(find_app "Debug-maccatalyst")
if [ -n "${MAC:-}" ]; then rm -rf dist/macos/OpenDeck.app; cp -R "$MAC" dist/macos/OpenDeck.app; echo "macos     -> dist/macos/OpenDeck.app"; stale_check "$MAC" "Contents/MacOS/App"; else echo "macos     - skipped (see docs/BUILDING.md § macOS)"; fi

# iOS simulator app
IOS=$(find_app "Debug-iphonesimulator")
if [ -n "${IOS:-}" ]; then rm -rf dist/ios/OpenDeck-simulator.app; cp -R "$IOS" dist/ios/OpenDeck-simulator.app; echo "ios(sim)  -> dist/ios/OpenDeck-simulator.app"; stale_check "$IOS" "App"; else echo "ios       - skipped (see docs/BUILDING.md § iOS)"; fi

echo "collected into $ROOT/dist/"
