#!/usr/bin/env bash
set -euo pipefail

SIGNING_IDENTITY="${APPLE_SIGNING_IDENTITY:--}"
APP_BUNDLE="src-tauri/target/release/bundle/macos/Translator.app"

if [[ ! -d "$APP_BUNDLE" ]]; then
  echo "Error: App bundle not found at ${APP_BUNDLE}"
  exit 1
fi

echo "Signing ${APP_BUNDLE} with identity: ${SIGNING_IDENTITY}"

find "$APP_BUNDLE/Contents/Frameworks" -name "*.dylib" -exec \
  codesign --force --sign "$SIGNING_IDENTITY" --timestamp {} \; 2>/dev/null || true

HELPER="${APP_BUNDLE}/Contents/Frameworks/Translator Helper.app"
if [[ -d "$HELPER" ]]; then
  codesign --force --deep --sign "$SIGNING_IDENTITY" \
    --entitlements "src-tauri/Entitlements.plist" \
    --timestamp "$HELPER" 2>/dev/null || true
fi

codesign --force --deep --sign "$SIGNING_IDENTITY" \
  --entitlements "src-tauri/Entitlements.plist" \
  --timestamp "$APP_BUNDLE"

echo "Verifying..."
codesign --verify --deep --strict "$APP_BUNDLE"
echo "Signed successfully"
