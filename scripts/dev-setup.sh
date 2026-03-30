#!/usr/bin/env bash
set -euo pipefail

info()  { printf "\033[34m→\033[0m %s\n" "$1"; }
ok()    { printf "\033[32m✓\033[0m %s\n" "$1"; }
fatal() { printf "\033[31m✗\033[0m %s\n" "$1" >&2; exit 1; }

echo ""
echo "  Translator — Dev Setup"
echo "  ───────────────────────"
echo ""

[[ "$(uname)" == "Darwin" ]] || fatal "macOS required"

if ! command -v node >/dev/null; then
  fatal "Node.js not found. Install via: brew install node"
fi
ok "Node.js $(node -v)"

if ! command -v cargo >/dev/null; then
  info "Rust not found. Installing..."
  curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
  source "$HOME/.cargo/env"
fi
ok "Rust $(rustc --version | awk '{print $2}')"

if ! command -v npm >/dev/null; then
  fatal "npm not found"
fi
ok "npm $(npm -v)"

info "Installing npm dependencies..."
npm install --no-fund --no-audit
ok "Dependencies installed"

info "Checking Rust compilation..."
cd src-tauri && cargo check 2>/dev/null && cd ..
ok "Rust compiles"

info "Checking TypeScript..."
npx tsc --noEmit 2>/dev/null
ok "TypeScript compiles"

echo ""
ok "Dev environment ready!"
echo ""
echo "  npm run dev        — Start dev server"
echo "  npx tauri dev      — Start Tauri app"
echo "  npx tauri build    — Build for production"
echo ""
