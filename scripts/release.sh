#!/usr/bin/env bash
set -euo pipefail

APP_NAME="Translator"
REPO="huutri/translator"
TAURI_CONF="src-tauri/tauri.conf.json"

info()  { printf "\033[34m→\033[0m %s\n" "$1"; }
ok()    { printf "\033[32m✓\033[0m %s\n" "$1"; }
fatal() { printf "\033[31m✗\033[0m %s\n" "$1" >&2; exit 1; }

check_prerequisites() {
  command -v gh >/dev/null || fatal "gh CLI required (brew install gh)"
  gh auth status >/dev/null 2>&1 || fatal "gh not authenticated (gh auth login)"
  command -v npm >/dev/null || fatal "npm required"
  [[ -f "$TAURI_CONF" ]] || fatal "Not in project root (${TAURI_CONF} not found)"

  local branch
  branch="$(git branch --show-current)"
  [[ "$branch" == "main" ]] || fatal "Must be on main branch (currently: ${branch})"

  if ! git diff --quiet HEAD 2>/dev/null; then
    fatal "Working tree not clean. Commit or stash changes first."
  fi
}

get_version() {
  grep '"version"' "$TAURI_CONF" | head -1 | sed 's/.*"\([0-9][^"]*\)".*/\1/'
}

build_release() {
  info "Building release..."
  npx tauri build --bundles app 2>&1

  local bundle="src-tauri/target/release/bundle/macos/${APP_NAME}.app"
  [[ -d "$bundle" ]] || fatal "Build failed: ${bundle} not found"

  info "Signing..."
  bash scripts/sign-macos-app.sh

  ok "Build complete"
}

package_release() {
  local bundle="src-tauri/target/release/bundle/macos/${APP_NAME}.app"
  local arch
  arch="$(uname -m | sed 's/arm64/aarch64/')"
  TAR_NAME="${APP_NAME}_${arch}.app.tar.gz"
  ZIP_NAME="${APP_NAME}_${arch}.zip"

  info "Packaging..."
  tar -czf "$TAR_NAME" -C "$(dirname "$bundle")" "$(basename "$bundle")"
  ditto -c -k --sequesterRsrc "$bundle" "$ZIP_NAME"

  ok "Packaged: ${TAR_NAME}, ${ZIP_NAME}"
}

create_release() {
  local version="$1"
  local tag="v${version}"

  if git rev-parse "$tag" >/dev/null 2>&1; then
    info "Tag ${tag} exists, using commit hash..."
    local short_sha
    short_sha="$(git rev-parse --short HEAD)"
    tag="v${version}-${short_sha}"
  fi

  info "Creating release ${tag}..."
  git tag "$tag"
  git push origin "$tag"

  gh release create "$tag" \
    --title "${APP_NAME} ${tag}" \
    --notes "Release ${tag}" \
    "$TAR_NAME" "$ZIP_NAME"

  ok "Release published: ${tag}"
}

main() {
  echo ""
  echo "  ${APP_NAME} Release"
  echo "  ────────────────────"
  echo ""

  check_prerequisites

  local version
  version="$(get_version)"
  info "Version: ${version}"

  build_release
  package_release
  create_release "$version"

  echo ""
  ok "Release complete!"
  echo ""
}

main "$@"
