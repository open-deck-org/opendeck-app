#!/usr/bin/env bash
# One-command pre-archive gate. Run this from anywhere right before you open
# Xcode → Product → Archive (iOS and/or Mac Catalyst — both come from the same
# iOS Xcode project, so a single `cap sync ios` covers both).
#
#   npm run prearchive
#
# It (1) syncs www + native deps into the iOS project and (2) verifies the
# things that silently break an upload: stale web assets, version/build,
# privacy manifest, icons, export-compliance flag. Nothing here bumps the build
# number — do that yourself when re-uploading (see the note it prints).
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PBX="ios/App/App.xcodeproj/project.pbxproj"
PLIST="ios/App/App/Info.plist"
PUBLIC="ios/App/App/public"
ICONSET="ios/App/App/Assets.xcassets/AppIcon.appiconset"
warn=0
note() { printf '  %s\n' "$1"; }
bad()  { printf '  ⚠️  %s\n' "$1"; warn=1; }

echo "▸ Syncing www + native deps into the iOS project (covers Mac Catalyst too)…"
npx cap sync ios || { echo "cap sync ios FAILED"; exit 1; }
echo ""

echo "▸ Pre-archive checks"

# 1. Web assets actually copied (the classic 'my change isn't in the build' trap).
# Ignore files that exist ONLY in public/ — Capacitor injects cordova.js &
# cordova_plugins.js there. We fail only on real drift: a www file that's
# missing from public ("Only in www") or whose bytes differ.
drift=$(diff -rq www "$PUBLIC" 2>/dev/null | grep -vE "^Only in $PUBLIC")
if [ -z "$drift" ]; then
  note "web assets: every www file present & identical in ios public ✅"
else
  bad "web assets drift vs www (cap sync may not have taken):"
  printf '%s\n' "$drift" | sed 's/^/        /'
fi

# 2. Version + build number
MV=$(grep -m1 'MARKETING_VERSION' "$PBX" | sed 's/.*= *//; s/;//')
BV=$(grep -m1 'CURRENT_PROJECT_VERSION' "$PBX" | sed 's/.*= *//; s/;//')
note "version: MARKETING_VERSION=$MV  build CURRENT_PROJECT_VERSION=$BV"

# 3. Privacy manifest present + referenced in the target
if [ -f "ios/App/App/PrivacyInfo.xcprivacy" ] && grep -q 'PrivacyInfo.xcprivacy' "$PBX"; then
  note "privacy manifest: present + wired ✅"
else
  bad "privacy manifest: missing or not referenced in project.pbxproj"
fi

# 4. App icons (light/dark/tinted 1024)
icons=$(ls "$ICONSET"/*1024*.png 2>/dev/null | wc -l | tr -d ' ')
if [ "$icons" -ge 1 ]; then note "app icons: $icons 1024px asset(s) present ✅"; else bad "app icons: no 1024px PNG in $ICONSET"; fi

# 5. Export compliance declared (so the upload prompt is a quick 'No')
if /usr/libexec/PlistBuddy -c 'Print :ITSAppUsesNonExemptEncryption' "$PLIST" >/dev/null 2>&1; then
  note "export compliance: ITSAppUsesNonExemptEncryption declared ✅"
else
  bad "export compliance: ITSAppUsesNonExemptEncryption missing from Info.plist"
fi

echo ""
if [ "$warn" -eq 0 ]; then
  echo "✅ Ready to archive."
else
  echo "⚠️  Resolve the warnings above before archiving."
fi
echo "   Reminder: bump the build number for any re-upload in Xcode → App target → General → Build
   (this sets CURRENT_PROJECT_VERSION, which CFBundleVersion references). Avoid 'agvtool' —
   it rewrites Info.plist to a literal and breaks that reference."
echo "   Then: Xcode → Any iOS Device → Product → Archive (then My Mac (Mac Catalyst) → Archive)."
exit $warn
