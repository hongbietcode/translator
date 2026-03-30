#!/usr/bin/env bash
set -euo pipefail

APP_NAME="Translator"
BUNDLE_ID="com.translator.dev"
REPO="huutri/translator"
INSTALL_PATH="/Applications/${APP_NAME}.app"
TMP_DIR="$(mktemp -d)"

cleanup() { rm -rf "$TMP_DIR"; }
trap cleanup EXIT

info()  { printf "\033[34m→\033[0m %s\n" "$1"; }
ok()    { printf "\033[32m✓\033[0m %s\n" "$1"; }
err()   { printf "\033[31m✗\033[0m %s\n" "$1" >&2; }
fatal() { err "$1"; exit 1; }

detect_arch() {
  case "$(uname -m)" in
    arm64|aarch64) echo "aarch64" ;;
    x86_64)        echo "x86_64" ;;
    *)             fatal "Unsupported architecture: $(uname -m)" ;;
  esac
}

check_prerequisites() {
  [[ "$(uname)" == "Darwin" ]] || fatal "macOS required"
  command -v curl >/dev/null || fatal "curl not found"
}

try_download_release() {
  local arch="$1"
  local zip_name="${APP_NAME}_${arch}.app.tar.gz"
  local url="https://github.com/${REPO}/releases/latest/download/${zip_name}"

  info "Downloading ${APP_NAME} for ${arch}..."
  if curl -fSL --progress-bar "$url" -o "${TMP_DIR}/${zip_name}" 2>/dev/null; then
    info "Extracting..."
    tar -xzf "${TMP_DIR}/${zip_name}" -C "$TMP_DIR"
    local app_bundle
    app_bundle="$(find "$TMP_DIR" -name "*.app" -maxdepth 2 -type d | head -1)"
    if [[ -n "$app_bundle" ]]; then
      echo "$app_bundle"
      return 0
    fi
  fi
  return 1
}

validate_bundle() {
  local bundle="$1"
  local plist="${bundle}/Contents/Info.plist"

  [[ -f "$plist" ]] || { err "Info.plist not found"; return 1; }

  local bid
  bid="$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$plist" 2>/dev/null || true)"
  if [[ "$bid" != "$BUNDLE_ID" ]]; then
    err "Bundle ID mismatch: expected ${BUNDLE_ID}, got ${bid}"
    return 1
  fi

  ok "Bundle validated: ${bid}"
}

build_from_source() {
  info "Building from source..."

  command -v node >/dev/null || fatal "Node.js required for source build"
  command -v cargo >/dev/null || fatal "Rust/Cargo required for source build"
  command -v npm >/dev/null || fatal "npm required for source build"

  local src_dir
  if [[ -f "package.json" ]] && [[ -f "src-tauri/tauri.conf.json" ]]; then
    src_dir="."
    info "Building from current directory..."
  else
    src_dir="${TMP_DIR}/source"
    info "Cloning repository..."
    git clone "https://github.com/${REPO}.git" "$src_dir"
  fi

  cd "$src_dir"
  npm install --no-fund --no-audit
  npx tauri build

  local app_bundle
  app_bundle="$(find src-tauri/target/release/bundle -name "*.app" -type d | head -1)"
  [[ -n "$app_bundle" ]] || fatal "Build succeeded but .app bundle not found"

  echo "$app_bundle"
}

sign_bundle() {
  local bundle="$1"
  info "Signing bundle (ad-hoc)..."
  codesign --force --deep --sign - "$bundle" 2>/dev/null || true
  xattr -cr "$bundle" 2>/dev/null || true
  ok "Signed"
}

install_bundle() {
  local source="$1"
  info "Installing to ${INSTALL_PATH}..."

  if [[ -d "$INSTALL_PATH" ]]; then
    info "Removing existing installation..."
    if [[ -w "/Applications" ]]; then
      rm -rf "$INSTALL_PATH"
    else
      sudo rm -rf "$INSTALL_PATH"
    fi
  fi

  if [[ -w "/Applications" ]]; then
    ditto "$source" "$INSTALL_PATH"
  else
    sudo ditto "$source" "$INSTALL_PATH"
  fi

  xattr -cr "$INSTALL_PATH" 2>/dev/null || true
  ok "Installed to ${INSTALL_PATH}"
}

main() {
  echo ""
  echo "  ${APP_NAME} Installer"
  echo "  ────────────────────"
  echo ""

  check_prerequisites
  local arch
  arch="$(detect_arch)"
  info "Architecture: ${arch}"

  local app_bundle=""

  if app_bundle="$(try_download_release "$arch")"; then
    ok "Downloaded release"
  else
    info "No release available, building from source..."
    app_bundle="$(build_from_source)"
    ok "Built from source"
  fi

  validate_bundle "$app_bundle" || fatal "Validation failed"
  sign_bundle "$app_bundle"
  install_bundle "$app_bundle"

  echo ""
  ok "${APP_NAME} installed successfully!"
  echo ""
  echo "  Open from /Applications or Spotlight."
  echo "  Press Cmd+L to start voice input."
  echo ""
}

main "$@"
