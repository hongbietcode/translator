# Build & Install Pipeline Research: dtateks/stt

**Repository:** https://github.com/dtateks/stt (macOS voice input app, Tauri + TypeScript + Rust)
**Research Date:** 2026-03-30
**Scope:** Build scripts, install mechanisms, distribution pipeline, Tauri configuration

---

## Executive Summary

The stt project uses a **sophisticated dual-channel release pipeline**:
1. **Manual local arm64 builds** (pre-push hook) for immediate arm64 releases
2. **GitHub Actions CI/CD** (on main push) for x64 builds + merged updater manifests

Installation is **binary-first** (downloads pre-built DMG/ZIP) with **fallback source build** if download fails. Code signing, microphone entitlements validation, and Tauri updater integration are built-in.

---

## 1. Build Scripts (npm)

### File: `package.json`

```json
{
  "name": "voice-to-text",
  "version": "1.0.0",
  "scripts": {
    "ui:dev": "vite --config vite.config.mjs",
    "ui:build": "vite build --config vite.config.mjs",
    "ui:preview": "vite preview --config vite.config.mjs",
    "start": "TAURI_APP_PATH=src tauri dev",
    "dev": "TAURI_APP_PATH=src tauri dev",
    "test": "npm run test:ui && cargo test --manifest-path src/Cargo.toml",
    "test:ui": "vitest run",
    "build": "TAURI_APP_PATH=src tauri build",
    "build:dmg": "TAURI_APP_PATH=src tauri build --bundles dmg",
    "hooks:install": "bash scripts/install-git-hooks.sh",
    "release": "bash scripts/release.sh"
  }
}
```

### Key Build Commands

| Command | Purpose |
|---------|---------|
| `npm run ui:build` | Build TypeScript/React UI (Vite) → `ui/dist/` |
| `npm run build` | Full Tauri build (UI + Rust) → `src/target/release/bundle/` |
| `npm run build:dmg` | macOS DMG bundle only |
| `npm run start / dev` | Local dev with hot reload |
| `npm run test` | Run UI tests (Vitest) + Rust tests |
| `npm run release` | Invoke release script (arm64 manual build + tag + publish) |
| `npm run hooks:install` | Install pre-push hook |

---

## 2. Tauri Configuration

### File: `src/tauri.conf.json`

```json
{
  "productName": "Voice to Text",
  "version": "1.0.0",
  "identifier": "com.voicetotext.stt",

  "build": {
    "beforeDevCommand": "npm run ui:dev",
    "beforeBuildCommand": "npm run ui:build",
    "devUrl": "http://127.0.0.1:1420",
    "frontendDist": "../ui/dist"
  },

  "app": {
    "macOSPrivateApi": true,
    "withGlobalTauri": true,
    "windows": [
      {
        "label": "main",
        "create": false,
        "url": "index.html",
        "title": "Voice to Text",
        "width": 360,
        "height": 560,
        "visible": false,
        "resizable": true
      },
      {
        "label": "bar",
        "create": false,
        "url": "bar.html",
        "title": "Voice to Text Bar",
        "width": 600,
        "height": 56,
        "visible": false,
        "resizable": false,
        "decorations": false,
        "alwaysOnTop": true,
        "skipTaskbar": true,
        "transparent": true,
        "visibleOnAllWorkspaces": true
      }
    ],
    "security": {
      "freezePrototype": true,
      "csp": "default-src 'self'; connect-src 'self' ipc: http://ipc.localhost https://ipc.localhost http://127.0.0.1:1420 ... wss://*.soniox.com https://github.com; img-src 'self' asset: ... ; media-src 'self' blob: data:; worker-src 'self' blob:; ..."
    }
  },

  "bundle": {
    "active": true,
    "targets": ["app"],
    "icon": ["icons/icon.icns", "icons/icon.ico", "icons/icon.png"],
    "resources": {
      "../config.json": "config.json"
    },
    "macOS": {
      "minimumSystemVersion": "11.0",
      "entitlements": "./Entitlements.plist",
      "hardenedRuntime": true,
      "exceptionDomain": "",
      "frameworks": []
    }
  },

  "plugins": {
    "updater": {
      "pubkey": "dW50cnVzdGVkIGNvbW1lbnQ6IG1pbmlzaWduIHB1YmxpYyBrZXkgKGJhc2U2NCk=",
      "endpoints": [
        "https://github.com/dtateks/stt/releases/latest/download/latest.json"
      ]
    }
  }
}
```

### Configuration Highlights

- **Dual Windows:** `main` (360×560) + `bar` (600×56 menubar-style)
- **Private API:** `macOSPrivateApi: true` for low-level macOS integration
- **Hardened Runtime:** macOS security (runtime code signing)
- **Entitlements:** Points to `src/Entitlements.plist` (microphone + Apple Events)
- **CSP:** Restricts connections to localhost, ipc, soniox, github only
- **Updater:** Plugin configured with endpoint to `latest.json` on GitHub releases

---

## 3. Installation Script

### File: `install.sh` (233 lines)

**Purpose:** Intelligent installer that prefers binaries but builds from source on failure.

#### Architecture Detection
```bash
detect_release_arch() {
  case "$(uname -m)" in
    arm64 | aarch64) echo "arm64" ;;
    x86_64) echo "x64" ;;
    *) exit 1 ;;
  esac
}
```

#### Download vs Build Decision Tree
```
1. Try download release ZIP from GitHub (arm64 or x64)
   ├─ If successful & passes validation → Install
   └─ If fails → Build from source
2. If no release found → Clone repo & build from source
3. Fallback: Build from current directory (if package.json exists)
```

#### Build from Source (if download fails)
```bash
build_app_bundle_from_source() {
  if [ -f "package.json" ] && [ -f "scripts/sign-macos-app.sh" ] && [ -f "src/tauri.conf.json" ]; then
    npm install --no-fund --no-audit
    npm run build
  else
    # Clone fresh repo
    git clone "https://github.com/dtateks/stt.git" "$SOURCE_REPO_DIR"
    cd "$SOURCE_REPO_DIR" && npm install && npm run build
  fi
}
```

#### Validation (Critical)
1. **Bundle Identity Check:** CFBundleIdentifier must be `com.voicetotext.stt`
2. **Entitlements Check:** App must have:
   - `com.apple.security.device.audio-input` (microphone)
   - `com.apple.security.automation.apple-events` (paste automation)
3. **Helper Validation:** If renderer helper exists, check its entitlements too

#### Installation
```bash
install_app_bundle() {
  if [ -w "/Applications" ]; then
    rm -rf "$INSTALL_PATH"
    ditto "$source_bundle" "$INSTALL_PATH"
    xattr -cr "$INSTALL_PATH"  # Remove quarantine attributes
  else
    sudo ditto "$source_bundle" "$INSTALL_PATH"
  fi
}
```

---

## 4. Release Script (Manual + CI Hook)

### File: `scripts/release.sh` (292 lines)

**Two modes:**
1. **Manual mode** (`npm run release` or `bash scripts/release.sh`)
2. **Pre-push hook mode** (triggered by git push to main)

#### Manual Release Flow
```
1. ensure_prerequisites()
   ├─ gh CLI must be authenticated
   ├─ Must be on main branch
   ├─ Working tree must be clean
   ├─ Signing script must be executable
   └─ Updater signing key must exist at $HOME/.tauri/stt-updater.key

2. build_and_package_local_arm64_release()
   ├─ npm run build
   ├─ ./scripts/sign-macos-app.sh (sign bundle)
   ├─ tar -czf Voice-to-Text-darwin-arm64.app.tar.gz (for updater)
   ├─ npx tauri signer sign (sign tar archive)
   └─ ditto -c -k Voice-to-Text-darwin-arm64.zip (package zip)

3. Tag Creation (local-{SHORT_SHA})
   └─ git tag local-{7-char-commit}

4. Generate Updater Manifest (latest.json)
   ├─ Extract version from src/tauri.conf.json
   ├─ Extract signature from .sig file
   ├─ Publish date (UTC timestamp)
   └─ GitHub download URL for tar.gz

5. Push Tag & Branch

6. Publish Release to GitHub
```

#### Pre-Push Hook Mode
```
.githooks/pre-push → scripts/release.sh --hook <remote> <url> <ref_file>
├─ Called when pushing to main
├─ Builds arm64 release locally
├─ Pushes tag to remote
└─ Publishes release (may fail in CI, fallback: CI builds both architectures)
```

#### Environment Requirements for Release
```bash
$HOME/.tauri/stt-updater.key          # Updater signing key
APPLE_SIGNING_IDENTITY="-"            # Default: ad-hoc signing (no certificate)
TAURI_SIGNING_PRIVATE_KEY             # GitHub secrets for CI
TAURI_SIGNING_PRIVATE_KEY_PASSWORD    # GitHub secrets for CI
```

---

## 5. Code Signing Script

### File: `scripts/sign-macos-app.sh` (63 lines)

```bash
sign_bundle_with_entitlements() {
  codesign \
    --force \
    --sign "$SIGNING_IDENTITY" \
    --entitlements "$ENTITLEMENTS_PATH" \
    "$bundle_path"

  if [ "$SIGNING_IDENTITY" != "-" ]; then
    codesign \
      --options runtime \
      --timestamp "$bundle_path"  # For notarization
  fi

  # Verify entitlements exist
  codesign -d --entitlements - "$bundle_path" | grep "com.apple.security.device.audio-input"
  codesign -d --entitlements - "$bundle_path" | grep "com.apple.security.automation.apple-events"
}

# Sign nested bundles first (renderer helper), then main app
for nested_app in "$APP_BUNDLE_PATH"/Contents/Frameworks/*.app; do
  sign_bundle_with_entitlements "$nested_app"
done
sign_bundle_with_entitlements "$APP_BUNDLE_PATH"
```

**Note:** Uses ad-hoc signing by default (`-`). For notarization, requires:
- Valid Apple Developer certificate in keychain
- `APPLE_SIGNING_IDENTITY` env var set to certificate name
- Runtime hardening + timestamp for Apple TCC (Transparency, Consent, Control)

---

## 6. GitHub Actions CI/CD

### File: `.github/workflows/release-main.yml`

#### Job 1: Prepare Release Metadata
```yaml
prepare-release:
  └─ Generate tag, release name, build matrix based on:
     ├─ If local arm64 release exists: build x64 only (matrix: 1 job)
     └─ Else: build both arm64 + x64 (matrix: 2 jobs)
```

#### Job 2: Build macOS (arm64 & x64)
```yaml
build-macos:
  needs: prepare-release
  strategy:
    matrix:
      - arch: arm64, runner: macos-15 (Apple Silicon)
      - arch: x64, runner: macos-15-intel
  steps:
    1. checkout
    2. setup node 22
    3. setup rust (dtolnay/rust-toolchain@stable)
    4. npm ci
    5. npm run build
    6. ./scripts/sign-macos-app.sh
    7. Verify entitlements: grep com.apple.security.device.audio-input
    8. ditto -c -k (package zip)
    9. tar -czf (package updater archive)
    10. npx tauri signer sign (sign tar for updater)
    11. Upload zip + tar.gz + sig as artifacts
```

#### Job 3: Build Windows (NSIS installer)
```yaml
build-windows:
  steps:
    1. checkout
    2. setup node 22
    3. setup rust
    4. npm ci
    5. npx tauri build --bundles nsis
    6. Copy installer → Voice-to-Text-windows-x64-setup.exe
```

#### Job 4: Publish Release
```yaml
publish-release:
  needs: [prepare-release, build-macos, build-windows]
  steps:
    1. Download all build artifacts
    2. Generate merged latest.json updater manifest
       ├─ Resolve arm64 & x64 tar.gz + signatures
       ├─ Extract signatures from .sig files
       ├─ Build platforms object with URLs
       └─ Write latest.json with version, pub_date, platforms
    3. Create GitHub Release with all assets
       ├─ ZIP files (macOS)
       ├─ .exe installer (Windows)
       ├─ .tar.gz + .sig (updater archives)
       └─ latest.json (updater manifest)
```

#### Asset Naming Convention
- **macOS:** `Voice-to-Text-darwin-{arm64|x64}.zip`
- **Windows:** `Voice-to-Text-windows-x64-setup.exe`
- **Updater:** `Voice-to-Text-darwin-{arm64|x64}.app.tar.gz` + `.sig`
- **Manifest:** `latest.json`

---

## 7. Git Hooks

### File: `.githooks/pre-push`

```bash
# Skip if STT_SKIP_PRE_PUSH_RELEASE=1 (prevents infinite loop)
# Triggers only for refs/heads/main
bash "scripts/release.sh" --hook "$1" "$2" "$ref_file"
```

### Installation
```bash
npm run hooks:install
# Installs .githooks/pre-push → .git/hooks/pre-push
```

---

## 8. Rust Build Configuration

### File: `src/Cargo.toml` (excerpt)

```toml
[package]
name = "voice_to_text"
version = "1.0.0"

[dependencies]
tauri = { version = "2", features = ["macos-private-api", "tray-icon"] }
tauri-plugin-autostart = "2"
tauri-plugin-global-shortcut = "2"
tauri-plugin-single-instance = "2"
tauri-plugin-updater = "2"
reqwest = { version = "0.12", features = ["json", "rustls-tls"] }

[target.'cfg(target_os = "macos")'.dependencies]
objc2 = "0.6"
objc2-av-foundation = { version = "0.3", features = ["AVCaptureDevice"] }
tauri-nspanel = { git = "https://github.com/ahkohd/tauri-nspanel" }
core-graphics = "0.23"

[target.'cfg(target_os = "windows")'.dependencies]
windows = "0.62.2"
```

---

## 9. Development Setup

```bash
# Install dependencies
npm install

# Install git hooks (pre-push release automation)
npm run hooks:install

# Development with hot reload
npm run dev

# Run tests
npm run test

# Local full build
npm run build

# DMG only (faster for testing)
npm run build:dmg
```

---

## 10. Release Workflow Summary

```
Developer → Local Commit → git push main
  ↓
  .githooks/pre-push (triggered)
  ├─ Build arm64 release locally (npm run build + sign)
  ├─ Create tag local-{SHA7}
  ├─ Publish to GitHub (arm64 ZIP + updater assets)
  └─ Push tag
  ↓
GitHub Actions (release-main.yml on main push)
  ├─ Job 1: Prepare metadata (check if arm64 already exists)
  ├─ Job 2: Build macOS
  │  ├─ If arm64 published: skip arm64, build x64 only
  │  └─ Else: build both arm64 + x64
  ├─ Job 3: Build Windows NSIS
  └─ Job 4: Publish merged release
     └─ Generate latest.json with both architectures
  ↓
Release published with all platforms + updater manifest
```

---

## 11. Distribution Channels

### Primary: GitHub Releases
- Direct download ZIPs
- Updater manifest (latest.json) for in-app updates
- Assets served from GitHub CDN

### Secondary: install.sh Script
- One-liner install: `curl https://raw.githubusercontent.com/dtateks/stt/main/install.sh | bash`
- Downloads latest release ZIP or builds from source
- Validates entitlements before install
- Copies to /Applications

---

## Architecture Trade-offs & Decisions

| Decision | Rationale | Trade-off |
|----------|-----------|-----------|
| **Pre-push hook builds arm64 locally** | Fast feedback, arm64 users get release immediately | Dev must have full build env (Node + Rust + Xcode) |
| **CI builds only if arm64 missing** | Avoid redundant work, optimize CI usage | Complex matrix logic, harder to debug |
| **Ad-hoc signing default** | Works for development, no cert management | Not notarized (may trigger GateKeeper on first run) |
| **install.sh binary-first** | Fast installs, offline-capable fallback | Source build adds 5+ min if download fails |
| **Dual updater manifests (arm64 + x64)** | Users always get correct arch | Extra CI complexity to merge manifests |

---

## Key Entitlements Required

File: `src/Entitlements.plist`

```
com.apple.security.device.audio-input          # Microphone access (TCC)
com.apple.security.automation.apple-events     # Paste automation (accessibility)
```

---

## Unresolved Questions

1. **Notarization:** Are releases notarized for Apple approval, or does first-run show "unverified developer" warning?
2. **Code signing cert:** Is `APPLE_SIGNING_IDENTITY` configured in CI secrets, or using ad-hoc signing?
3. **Updater signing key:** How is `$HOME/.tauri/stt-updater.key` bootstrapped? Pre-generated and committed somewhere secure?
4. **GitHub secrets:** Are `TAURI_SIGNING_PRIVATE_KEY` + `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` stored as Actions secrets?
5. **Windows CI:** Why build Windows on every push if focus is macOS? Future expansion or existing Windows users?
6. **Arm64 pre-push:** What if developer is on Intel Mac? Does pre-push hook gracefully skip or fail?

---

## Recommendations for Translator Project

**If adapting this pipeline for translator:**

1. **Keep the two-channel approach** (local fast-path + CI fallback) but consider your target platforms
2. **Use DMG for macOS distribution** (more polished than ZIP)
3. **Validate entitlements** for any speech/audio features (if translator needs microphone)
4. **Updater manifest generation** is clean; reuse the pattern
5. **install.sh as download alternative** is excellent UX for CLI/script users
6. **Pre-push hook optimization** saves CI minutes if you build frequently; skip if team is small
7. **Code signing:** Plan certificate management early if targeting App Store distribution

