# dtateks/stt Repository Analysis Report

**Date:** 2026-03-30 | **Analyzed:** https://github.com/dtateks/stt

---

## Executive Summary

**dtateks/stt** is a mature macOS-native voice-to-text application built with Tauri 2. Core flow: global hotkey captures audio → Soniox WebSocket processes STT in real-time → optional LLM post-processes transcript → text inserted into focused application via accessibility APIs. Architecture emphasizes real-time streaming, low-latency UI feedback, and seamless system integration.

---

## Project Overview

**Description:** Global voice input app for macOS — speak anywhere, text appears at cursor
- **Repository:** dtateks/stt (fork of hungson175/voice-everywhere)
- **License:** MIT
- **Language Mix:** TypeScript (52.9%), Rust (29.7%), CSS (8.9%), HTML (4.2%), Shell (2.9%)
- **Maturity:** 9 releases, 104 commits, active development
- **Target:** macOS only (leverages native APIs extensively)

---

## Complete Feature List

### Core STT Pipeline
- **Real-time voice capture** via Web Audio API (PCM S16LE streaming)
- **Soniox WebSocket integration** for streaming speech-to-text transcription
- **Language support:** Vietnamese + English (configured via language hints)
- **Configurable STT models:** stt-rt-v4 (default), switchable per session
- **Endpoint detection:** Automatic silence/pause detection to stop listening
- **Context awareness:** Domain hints ("desktop dictation"), topic hints for better accuracy

### LLM Post-Processing (Optional)
- **LLM providers:** xAI, Google Gemini, OpenAI-compatible APIs
- **Transcript correction:** Optional grammar/style correction via LLM
- **Configurable models:** grok-4-1-fast-non-reasoning (xAI default), gemini-2.5-flash-lite (Gemini default)
- **Retry logic:** Automatic retry on transient failures (3 attempts with exponential backoff)
- **Temperature control:** Configurable (default 0.1 for consistency)

### Text Insertion & System Integration
- **Accessibility-aware insertion:** Uses macOS Accessibility API + AppleScript
- **Paste via clipboard:** Preserves clipboard state (format restoration post-insertion)
- **Enter-mode support:** Automatic Enter key press after insertion (toggle per session)
- **Long text handling:** 700ms delay for >200 char texts, 200ms for short texts
- **Retry mechanism:** 2 attempts with 75ms delays for System Events reliability

### User Interface
- **Menubar app:** Always available via system tray
- **Settings window:** API key management (Soniox, xAI, Gemini), LLM provider/model selection
- **Recording bar:** Floating overlay shows recording state, interim/final transcript, stop-word detection
- **Preferences panel:**
  - Mic toggle shortcut customization (Control+Alt+V default)
  - Stop word configuration (e.g., "thank you" to finalize)
  - Custom LLM base URL support
  - Output language selection (auto/English/Vietnamese)
  - Reminder beep toggle
  - Enter mode toggle

### Global Hotkey System
- **Customizable shortcut:** Default Control+Alt+V, user-configurable
- **Dynamic registration:** Unregister → validate → register new shortcut (transactional)
- **Error recovery:** Rollback on registration failure
- **State synchronization:** Shortcut state persisted across app sessions

### Advanced Features
- **Stop word detection:** Custom phrase to end recording (e.g., "thank you")
- **Session preferences persistence:** Auto-save user settings (Tauri storage API)
- **Auto-start capability:** Launchd integration (tauri-plugin-autostart)
- **Single instance enforcement:** Tauri plugin prevents duplicate app launches
- **Auto-update support:** Tauri updater plugin with release channels

---

## Technology Stack

### Frontend (TypeScript/Vite)
```
Vite 7.1.11         - Build tool (ES2022 target)
TypeScript 5.9.3    - Type safety (strict mode)
Vitest 3.2.4        - Unit testing
JSDOM 27.0.1        - DOM mocking for tests
```

### Backend (Rust/Tauri)
```
Tauri 2.10.1        - Desktop framework (v2 with private APIs)
Tauri Plugins (all v2):
  - global-shortcut 2.3.0  - Global hotkey registration
  - single-instance 2      - Single-instance enforcement
  - autostart 2            - Login auto-start
  - updater 2              - App update delivery
  - nspanel (fork)         - macOS NSPanel window support

Native Bindings:
  - objc2 0.6              - Rust-Objective-C FFI
  - objc2-foundation       - NSString, NSData, NSArray APIs
  - objc2-app-kit 0.3      - NSWorkspace, NSRunningApplication
  - objc2-web-kit 0.3      - WKWebView integration
  - objc2-av-foundation    - AVCaptureDevice APIs
  - core-graphics 0.23     - Mouse position tracking (CGEvent)
  - tauri-nspanel (v2.1)   - Custom macOS panels

HTTP Client & Serialization:
  - reqwest 0.12           - HTTP with rustls-tls (no openssl)
  - serde/serde_json       - JSON serialization
  - base64 0.22            - Clipboard data encoding
```

### External Services
```
Soniox STT         - Real-time speech-to-text via WebSocket (wss://stt-rt.soniox.com)
xAI API            - LLM correction via grok-4-1 family
Google Gemini API  - Alternative LLM provider
OpenAI-compatible  - Custom API support (base URL configurable)
```

---

## Architecture Overview

### High-Level Flow Diagram
```
[Global Hotkey] → [Audio Capture] → [Soniox WebSocket] → [Stop-Word Detect]
                                            ↓
                                    [Stream Interrupted?]
                                    ↓          ↓
                                [Retry]   [Finalize]
                                    ↓          ↓
                                    └─→ [LLM Correction] (optional)
                                            ↓
                                    [Text Insertion API]
                                    (clipboard + AppleScript)
                                            ↓
                                    [Focused App Gets Text]
```

### Component Architecture

**macOS Native Layer (Rust)**
- `lib.rs` (820 LOC): Tauri app initialization, window management, shortcut state machine
- `text_inserter.rs` (650+ LOC): Accessibility API + AppleScript bridge for text insertion
- `permissions.rs`: Runtime permission checks (accessibility, automation, microphone)
- `shell_credentials.rs`: Secure credential storage via macOS Keychain wrapper

**Backend Services**
- `soniox_auth.rs`: Temporary API key generation (1hr expiry) with bearer token auth
- `soniox_models.rs`: Soniox STT response parsing and model definitions
- `llm_service.rs` (400+ LOC): Multi-provider LLM client (xAI, Gemini, OpenAI-compatible)
- `credentials.rs`: Credential loading from config.json + environment

**Frontend Layer (TypeScript)**
- `main.ts` (1400+ LOC): Main settings window, preferences UI, setup flow
- `bar.ts` (350+ LOC): Recording overlay state & rendering
- `bar-session-controller.ts` (900+ LOC): **Core orchestration** — manages audio → Soniox → LLM → insertion pipeline
- `bar-state-machine.ts`: State transitions (HIDDEN → LISTENING → PROCESSING → INSERTED)
- `soniox-client.ts` (400+ LOC): WebSocket STT client with PCM streaming protocol
- `storage.ts`: Preference persistence (localStorage-backed)
- `stop-word.ts`: Stop-word normalization and detection logic

### Data Flow Architecture

**Real-Time Path (Audio → Transcription)**
```
Mic Input (48kHz native)
  → Web Audio API (resample to 16kHz)
  → AudioWorklet (pcm-capture-processor.js)
  → PCM S16LE binary chunks
  → WebSocket frame stream
  → Soniox (real-time tokens)
  → BarSessionController (aggregate final/interim)
  → UI render
```

**Post-Processing Path (Transcript → Output)**
```
Final Transcript (from Soniox)
  → Stop-word detection (normalizedStopWord match)
  → LLM correction (if enabled)
    ├─ Retry 3x on transient errors
    └─ Fallback to original if LLM fails
  → Insert via text_inserter.rs
    ├─ Check accessibility permission
    ├─ Snapshot clipboard
    ├─ Paste text via AppleScript
    ├─ Restore clipboard formats
    └─ Optional Enter key press
  → Finalize and hide recording bar
```

**Configuration Path**
```
config.json (bundled)
  → Soniox WS URL, model, sample rate
  → LLM provider, model, temperature
  → Stop word
  → Runtime overrides via bridge commands
```

---

## Key Source Files & Their Purposes

### Rust Backend (`/src/src/`)

| File | LOC | Purpose |
|------|-----|---------|
| `lib.rs` | ~820 | Tauri app lifecycle, window mgmt, global shortcut orchestration |
| `commands.rs` | ~270 | Tauri command export (get_config, create_soniox_temporary_key, etc.) |
| `text_inserter.rs` | ~650 | Accessibility API + AppleScript text insertion with permission checks |
| `permissions.rs` | ~190 | Permission verification (accessibility, automation, microphone) |
| `llm_service.rs` | ~400 | Multi-provider LLM client (xAI, Gemini, OpenAI), request/response handling |
| `soniox_auth.rs` | ~133 | Soniox temp API key endpoint, bearer token auth |
| `soniox_models.rs` | ~130 | Soniox config/response type definitions |
| `credentials.rs` | ~270 | Credential loading from config + env vars |
| `shell_credentials.rs` | ~150 | macOS Keychain integration for secure storage |

### TypeScript Frontend (`/ui/src/`)

| File | LOC | Purpose |
|------|-----|---------|
| `main.ts` | ~1400 | Settings/preferences UI, setup flow, API key management |
| `bar.ts` | ~350 | Recording bar UI state and rendering |
| `bar-session-controller.ts` | ~900 | **Core orchestration** — audio capture → Soniox → LLM → insertion |
| `bar-state-machine.ts` | ~120 | State machine (HIDDEN, LISTENING, PROCESSING, INSERTED, ERROR) |
| `soniox-client.ts` | ~400 | WebSocket client for Soniox STT protocol |
| `bar-render.ts` | ~170 | DOM manipulation for recording bar UI |
| `storage.ts` | ~210 | localStorage preference persistence |
| `stop-word.ts` | ~90 | Stop-word normalization (trim, lowercase, accent removal) |
| `shortcut-recorder-logic.ts` | ~50 | Key capture for global shortcut customization |
| `main-logic.ts` | ~80 | Setup form validation (Soniox key verification) |
| `startup-permissions.ts` | ~70 | macOS permission request flow on app start |
| `pcm-capture-processor.js` | ~40 | AudioWorklet processor for PCM capture |
| `types.ts` | Interface definitions for Tauri bridge and Soniox protocol |

### Configuration (`config.json`)

```json
{
  "soniox": {
    "ws_url": "wss://stt-rt.soniox.com/transcribe-websocket",
    "model": "stt-rt-v4",
    "sample_rate": 16000,
    "num_channels": 1,
    "audio_format": "pcm_s16le",
    "chunk_size": 4096,
    "language_hints": ["vi", "en"],
    "language_hints_strict": true,
    "enable_endpoint_detection": true,
    "max_endpoint_delay_ms": 500,
    "context_general": [{"key": "domain", "value": "desktop dictation"}]
  },
  "llm": {
    "provider": "xai",
    "model": "grok-4-1-fast-non-reasoning",
    "temperature": 0.1
  },
  "voice": {
    "stop_word": "thank you"
  }
}
```

---

## Audio & STT Pipeline Details

### Audio Capture (Web Audio API)
- **Source:** Microphone via getUserMedia (with browser permission)
- **Sample rate:** Native 48kHz → downsampled to 16kHz via AudioContext
- **Format:** PCM S16LE (signed 16-bit little-endian)
- **Chunking:** 4096-sample chunks (256ms at 16kHz)
- **Worklet:** AudioWorklet processor (pcm-capture-processor.js) converts linear PCM to binary
- **Streaming:** Chunks sent as binary WebSocket frames to Soniox

### Soniox WebSocket Protocol
**Handshake (JSON config)**
```json
{
  "api_key": "<temporary_api_key>",
  "model": "stt-rt-v4",
  "language": "auto",
  "language_hints": ["en", "vi"],
  "context_general": [{"key": "domain", "value": "desktop dictation"}],
  "enable_endpoint_detection": true
}
```

**Streaming Phase**
- Frame 1: JSON config object
- Frames 2+: Binary PCM S16LE chunks (4096 bytes each)
- Incoming: JSON token objects with `{"text": "...", "is_final": true/false}`
- Termination: Send `{"type": "finalize"}` control message

**Response Handling**
- Interim tokens: Accumulated and rendered live
- Final tokens: Separately accumulated for final output
- Errors: JSON with `error` / `error_code` / `error_message` fields

### LLM Correction Pipeline (Optional)
**Request Format (xAI example)**
```json
{
  "model": "grok-4-1-fast-non-reasoning",
  "temperature": 0.1,
  "messages": [{
    "role": "user",
    "content": "Fix spelling and grammar: <transcript>"
  }]
}
```

**Retry Logic**
- Transient errors: HTTP 408, 429, 500, 502, 503, 504
- Message patterns: Timeout, connection reset, DNS error, network unreachable
- Max attempts: 3 (with exponential backoff)
- Fallback: Return original transcript if all retries fail

**Provider-Specific Endpoints**
- **xAI:** `https://api.x.ai/v1/chat/completions`
- **Gemini:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **OpenAI-compatible:** User-configurable base URL (default: `https://api.openai.com/v1`)

### Text Insertion (macOS-Specific)
**Permission Chain**
1. Accessibility permission (required for keyboard simulation)
2. Automation permission (for AppleScript System Events execution)
3. Microphone permission (for audio capture)

**Insertion Method**
1. Snapshot clipboard (preserve current state/formats)
2. Paste text via AppleScript: `System Events keystroke (Cmd+V)`
3. Optional: Press Enter key if enter_mode enabled
4. Restore clipboard to original state

**Delays & Retry**
- Short text (<200 chars): 200ms pre-insertion delay
- Long text (≥200 chars): 700ms pre-insertion delay
- System Events failures: Retry 2x with 75ms delays
- Post-insertion: 100ms delay before UI feedback

**Supported Targets**
- Works in any application accepting keyboard input (text editors, browsers, terminals, etc.)
- Focus-stealing prevention: Records focused window before insertion, restores after

---

## APIs & External Services

### Soniox STT
- **Endpoint:** `wss://stt-rt.soniox.com/transcribe-websocket`
- **Auth:** Bearer token (temporary API key, 1hr expiry)
- **Method:** WebSocket streaming
- **Models:** stt-rt-v4 (default, real-time), other variants available
- **Pricing:** Pay-per-minute usage

### xAI (Grok) API
- **Endpoint:** `https://api.x.ai/v1/chat/completions`
- **Auth:** Bearer token (long-lived API key in settings)
- **Models:** grok-4-1-fast-non-reasoning (default), grok-4-1-large, grok-4-1-preview
- **Use:** Optional LLM-based transcript correction

### Google Gemini API
- **Endpoint:** `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- **Auth:** Bearer token (API key)
- **Models:** gemini-2.5-flash-lite (default), gemini-2.5-flash
- **Use:** Alternative LLM provider

### OpenAI-Compatible API
- **Base URL:** User-configurable (defaults to `https://api.openai.com/v1`)
- **Auth:** Bearer token
- **Compatibility:** Any OpenAI-compatible API (Azure OpenAI, local Ollama, etc.)
- **Use:** Flexible LLM provider for custom deployments

---

## Security Considerations

### Credential Management
- **Soniox key:** Temporary API keys (1hr) generated server-side, never long-lived keys in browser
- **LLM keys:** Stored in config.json, sent via Tauri IPC (process-local)
- **No hardcoded secrets:** All credentials user-provided or environment-configured

### Permissions Model
- **Accessibility:** Explicit user approval via System Settings
- **Automation:** macOS dialog on first AppleScript execution
- **Microphone:** Standard macOS permission prompt
- **File access:** None (config.json bundled in app)

### Data Privacy
- **No telemetry:** App doesn't phone home or log usage
- **Clipboard:** Captured and restored (preserved across insertion)
- **Transcripts:** Sent to Soniox (chosen by user, TLS in transit)
- **LLM processing:** Sent to configured LLM provider

---

## Build & Deployment

### Development
```bash
npm run dev              # Tauri dev with hot reload
npm run test            # UI tests + Rust tests
npm run ui:dev          # Vite dev server only
```

### Build
```bash
npm run build           # Debug build
npm run build:dmg       # macOS DMG installer (distribution)
npm run release         # Full release workflow (git tag + DMG)
```

### Bundling
- **Executable:** Native Rust binary (compiled to arm64/x86_64)
- **WebView:** WKWebView (macOS native)
- **Distribution:** DMG installer with code-signing support
- **Auto-update:** Tauri updater with GitHub releases integration

---

## Development Patterns & Conventions

### State Management
- **Bar session state:** BarState enum (HIDDEN, LISTENING, PROCESSING, INSERTED, ERROR)
- **UI state:** DOM-driven (querySelector refs), declarative updates
- **Preferences:** localStorage with JSON serialization
- **Transient state:** Managed in BarSessionController (singleton per app lifecycle)

### Error Handling
- **Rust:** Result<T, String> (error messages passed to UI)
- **TypeScript:** Try-catch + callback-based error handlers
- **UI:** Error banner with user-actionable messages
- **Recovery:** Automatic retry for transient failures, user retry for permission issues

### Code Organization
- **Separation of concerns:** UI rendering (bar.ts), orchestration (bar-session-controller.ts), protocol (soniox-client.ts)
- **Side-effect isolation:** Tauri commands pure, IPC side effects in controllers
- **Type safety:** Full TypeScript strict mode, Rust type system for memory safety

---

## Unresolved Questions

1. **App signing & notarization:** How is the DMG build signed for distribution? Hardened runtime enabled?
2. **Crash reporting:** Any telemetry or error aggregation service integrated?
3. **Offline mode:** Can the app function without Soniox/LLM (fallback to local STT)?
4. **Multi-window state sync:** How are settings changes synced between main and bar windows?
5. **Performance metrics:** What are typical latency numbers (audio capture → text insertion)?
6. **Rate limiting:** Any backoff logic for Soniox or LLM provider quota limits?
7. **Test coverage:** What's the current unit test coverage for critical paths?
8. **Accessibility audits:** Has the UI been audited for VoiceOver compatibility?

---

## Summary for Translator App Integration

**Key takeaways for cross-pollination:**
- ✅ **Mature Tauri v2 + Rust backend:** Proven pattern for macOS native integration
- ✅ **WebSocket streaming STT:** Real-time transcript handling with interim/final tokens
- ✅ **LLM correction pipeline:** Multi-provider support with automatic retry
- ✅ **Accessibility-first text insertion:** Robust AppleScript + permission handling
- ✅ **Configuration-driven:** config.json model for runtime provider switching
- ✅ **Error recovery:** Transactional shortcut updates, clipboard preservation
- ⚠️ **Audio worklet complexity:** PCM capture processor adds build/debugging overhead
- ⚠️ **macOS-only:** Tauri private APIs and objc2 bindings not portable to Linux/Windows
