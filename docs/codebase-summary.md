# Codebase Summary — Personal Translator

**Last Updated:** 2026-03-14
**Project Version:** 0.1.0
**Frontend Stack:** React 19 + TypeScript 5.6 + Vite 6 + Tailwind CSS v4
**Backend Stack:** Rust + Tauri 2

## Overview

Personal Translator is a macOS desktop application that provides real-time speech-to-text transcription and translation powered by Soniox API v4. The application captures system audio or microphone input, streams it to Soniox via WebSocket, and displays translations in a minimal overlay window.

## Architecture

### High-Level Flow

```
┌─────────────────┐
│  macOS System   │
│  Audio / Mic    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Rust Backend (Tauri Commands)          │
│  ├─ ScreenCaptureKit (system audio)     │
│  ├─ AVFoundation (microphone)           │
│  └─ Audio buffering & resampling        │
└────────┬────────────────────────────────┘
         │ (Tauri IPC)
         ▼
┌─────────────────────────────────────────┐
│  React Frontend (Custom Hooks)          │
│  ├─ useAudioCapture (IPC → PCM)         │
│  ├─ useSoniox (WebSocket client)        │
│  ├─ useHistory (local persistence)      │
│  └─ useSettings (Tauri storage)         │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  UI Components (Tailwind CSS v4)        │
│  ├─ OverlayView (real-time display)     │
│  ├─ SettingsView (configuration)        │
│  ├─ HistoryView (session archive)       │
│  └─ Toast (notifications)               │
└─────────────────────────────────────────┘
         │
         ▼
┌──────────────────┐
│  Soniox API v4   │
│  (WebSocket STT) │
└──────────────────┘
```

## Directory Structure

```
translator/
├── src/                           # React frontend (TypeScript)
│   ├── components/
│   │   ├── overlay-view.tsx       # Main translating UI
│   │   ├── settings-view.tsx      # Configuration panel
│   │   ├── history-view.tsx       # Session history browser
│   │   ├── titlebar.tsx           # macOS window controls
│   │   ├── source-selector.tsx    # Audio source picker
│   │   ├── transcript-display.tsx # Real-time transcript renderer
│   │   └── toast.tsx              # Toast notification system
│   ├── hooks/                     # Custom React hooks (Tauri IPC)
│   │   ├── use-settings.ts        # Get/save settings via Tauri
│   │   ├── use-audio-capture.ts   # Capture system/mic audio
│   │   ├── use-soniox.ts          # WebSocket client wrapper
│   │   ├── use-history.ts         # Session storage & export
│   │   ├── use-transcript.ts      # Current transcript state
│   │   └── use-input-devices.ts   # Microphone enumeration
│   ├── lib/
│   │   ├── soniox-websocket-client.ts # Raw WebSocket impl
│   │   └── utils.ts               # Utility functions
│   ├── types/
│   │   └── settings.ts            # TypeScript interfaces
│   ├── App.tsx                    # Root component & state orchestration
│   ├── main.tsx                   # React DOM mount
│   └── globals.css                # Global + Tailwind directives
│
├── src-tauri/                     # Rust backend (Tauri)
│   └── src/
│       ├── audio/
│       │   ├── mod.rs             # Audio module exports
│       │   ├── system_audio.rs    # ScreenCaptureKit wrapper
│       │   └── microphone.rs      # AVFoundation wrapper
│       ├── commands/
│       │   ├── mod.rs             # Command module exports
│       │   ├── audio.rs           # start_capture, stop_capture
│       │   ├── settings.rs        # get_settings, save_settings
│       │   └── transcript.rs      # transcript (local file I/O)
│       ├── settings.rs            # Settings struct & persistence
│       ├── lib.rs                 # Library entrypoint
│       └── main.rs                # Tauri app initialization
│
├── node_modules/                  # Dependencies (npm)
├── package.json                   # Frontend dependencies
├── package-lock.json              # Dependency lock
├── vite.config.ts                 # Vite build config
├── tsconfig.json                  # TypeScript root config
├── tsconfig.app.json              # Frontend TypeScript config
├── tsconfig.node.json             # Build script TypeScript config
├── index.html                     # Entry HTML
├── README.md                       # User-facing docs
├── docs/                          # Internal documentation
└── repomix-output.xml             # Codebase compaction (AI analysis)
```

## Frontend Layer (React 19 + TypeScript)

### Entry Point: `App.tsx`

Orchestrates all component and hook interactions:
- Manages global state: `currentView`, `isRunning`, `currentSource`, `currentDevice`
- Wires event handlers (menu events, keyboard shortcuts) to state changes
- Routes between `OverlayView`, `SettingsView`, `HistoryView`
- Handles graceful shutdown (saves window position, stops audio)

**Key Functions:**
- `start()` / `stop()` / `toggle()` — Audio capture & Soniox session lifecycle
- `handleSourceChange()` — Switch audio input (system/mic/both), restart if needed
- `handleClose()` — Save window state, cleanup, exit

### Custom Hooks Pattern

All Tauri IPC and business logic is encapsulated in hooks:

| Hook | Purpose | Key Functions |
|------|---------|----------------|
| `useSettings` | Load/save settings via Tauri | `updateSettings()`, `onChange()` |
| `useAudioCapture` | Start/stop PCM stream | `startCapture()`, `stopCapture()`, `setOnAudioData()` |
| `useSoniox` | WebSocket lifecycle & transcripts | `connect()`, `disconnect()`, `sendAudio()`, `clearSegments()` |
| `useHistory` | Session persistence | `startSession()`, `addEntry()`, `endSession()`, `exportText()` |
| `useTranscript` | Current session transcript | `appendTranscript()`, `clear()` |
| `useInputDevices` | Microphone enumeration | Provides list of input device IDs |

### Component Breakdown

**OverlayView** (`overlay-view.tsx`)
- Main translating UI. Renders segments, provisional text, status.
- Inputs: `segments`, `provisionalText`, `provisionalSpeaker`, `isRunning`, `fontSize`, `opacity`
- Actions: play/pause toggle, settings/history nav, source picker, clear

**SettingsView** (`settings-view.tsx`)
- Configuration panel for API key, language pair, audio source, overlay opacity, font size, etc.
- Syncs changes to Tauri backend on save
- Validates Soniox API key availability before allowing save

**HistoryView** (`history-view.tsx`)
- Displays archived sessions (date, source, language pair, transcript)
- Actions: export (copy to clipboard), clear all

**TitleBar** (`titlebar.tsx`)
- macOS window chrome: close, minimize, maximize buttons

**SourceSelector** (`source-selector.tsx`)
- Radio picker: System Audio, Microphone, or Both
- Enumerates available microphone devices

**TranscriptDisplay** (`transcript-display.tsx`)
- Renders segments with speaker labels, scrolls to latest

**Toast** (`toast.tsx`)
- Non-blocking notifications (success, error, info, warning)

### Styling: Tailwind CSS v4

- Uses CSS variables for theming
- Dark overlay-first design
- No external UI component library (shadcn not suitable for desktop)
- Responsive to window size, not viewport-centric

### TypeScript Configuration

- **Target:** ES2020
- **Module:** ESNext
- **JSX:** react-jsx
- **Strict mode:** enabled
- **Path aliases:** `@/` → `src/`

## Backend Layer (Rust + Tauri 2)

### Audio Capture Pipeline

**System Audio** (`system_audio.rs`)
- Uses ScreenCaptureKit (macOS 13+)
- Captures at 48kHz stereo
- Resamples to 16kHz mono PCM (required by Soniox)
- Buffers in 200ms chunks for low-latency streaming

**Microphone** (`microphone.rs`)
- Uses AVFoundation (AVAudioEngine)
- Captures at 16kHz mono PCM directly
- Requires microphone permission grant

### Tauri Commands (IPC Bridge)

**Audio Commands** (`commands/audio.rs`)
```rust
start_capture(source: string, device?: string) → Result<()>
stop_capture() → Result<()>
set_on_audio_data(callback: JS) → Result<()>
```
Streams PCM bytes via Tauri event to frontend.

**Settings Commands** (`commands/settings.rs`)
```rust
get_settings() → Result<Settings>
save_settings(newSettings: Settings) → Result<()>
```
Persists to `~/.config/personal-translator/settings.json`

**Transcript Commands** (`commands/transcript.rs`)
```rust
save_transcript(filename: string, content: string) → Result<()>
```
Writes daily transcript files to `~/.local/share/personal-translator/transcripts/`

### Settings Struct

```rust
pub struct Settings {
    pub soniox_api_key: String,
    pub source_language: String,
    pub target_language: String,
    pub audio_source: String,    // "system", "microphone", "both"
    pub overlay_opacity: f32,
    pub font_size: i32,
    pub max_lines: i32,
    pub show_original: bool,
    pub custom_context: Option<CustomContext>,
}
```

## Data Flow: Real-Time Translation

1. **User starts capture** → `App.tsx:start()` calls `startCapture()` + `soniox.connect()`
2. **Rust captures audio** → Streams 16kHz PCM via Tauri event
3. **React receives PCM** → `use-audio-capture` hook's callback fires
4. **Send to Soniox** → `useSoniox.sendAudio()` pushes buffer to WebSocket
5. **WebSocket response** → `SonioxWebSocketClient` parses tokens
6. **Update state** → `useSoniox` state machine updates segments, provisional text
7. **Render UI** → React re-renders `OverlayView` with new segments
8. **Persist history** → `useHistory.addEntry()` saves to local session
9. **Auto-reset** → After 3 minutes idle, Soniox session auto-resets, reconnect happens

## Key Design Patterns

### No External UI Framework
- Raw Tailwind CSS components (no shadcn/ui)
- Soniox React SDK unsuitable for desktop → built custom WebSocket client
- Lightweight custom components for overlay paradigm

### Hook-Based Architecture
- All business logic in custom hooks
- Components are pure presentational
- State lives in hooks + React's `useState`/`useRef`
- Easy to test hooks in isolation

### Ref-Based Callbacks
- `onTranslationRef.current` pattern to avoid stale closure bugs
- Allows App.tsx to register callbacks without re-creating hooks

### Graceful Degradation
- Missing API key → show toast, switch to settings
- Audio permission denied → catch + toast + stop
- WebSocket disconnect → auto-reconnect up to 3x with 2s backoff
- Stale segments auto-cleaned (>10s, >3 pending, >1200 chars)

## Build & Development

### Frontend Build
```bash
npm run dev      # Vite dev server (HMR)
npm run build    # TypeScript + Vite bundle
```

### Backend Build
```bash
cargo build      # Rust + Tauri compilation
npm run tauri build
```

### Build Stack
- **Bundler:** Vite 6 with `@tailwindcss/vite` plugin
- **Compiler:** TypeScript 5.6 (via `tsc -b`)
- **Tauri:** v2 (cross-platform desktop framework)

## Metrics (as of 2026-03-14)

| Metric | Value |
|--------|-------|
| Total Files | 55 |
| Total Tokens | 38,507 |
| Frontend (src/) | ~27 files |
| Backend (src-tauri/) | ~10 files |
| Largest File | `settings-view.tsx` (4,371 tokens) |
| Build Time | ~30s (clean) |

## Dependencies (Key)

### Frontend
- `react@19.0.0` — UI framework
- `vite@6.0.5` — Build tool
- `tailwindcss@4` — CSS framework
- `typescript@5.6` — Language
- `@tauri-apps/api@2` — Tauri IPC
- `lucide-react@0.469` — Icon library

### Backend
- `tauri@2` — Desktop framework
- `serde`/`serde_json` — Serialization
- `tokio` — Async runtime
- `screencapturekit` — System audio (via Tauri plugin)

## Known Issues & TODOs

1. **Stale closure in `handleSourceChange`** (App.tsx) — Start callback might be stale if settings change during restart
2. **Double handler wrapping in `useSoniox`** — Callback composition fragile, should consolidate
3. **`updateSettings` stale merge risk** — Rapid calls may lose updates; consider functional updater
4. **No offline mode** — Requires Soniox connection; no local fallback
5. **Limited error messages** — Network errors could be more descriptive

## Testing

Currently no automated test suite. Recommended:
- Unit tests for hooks (useSoniox, useSettings, useHistory)
- Integration tests for App state transitions
- E2E tests for audio capture pipeline

## Deployment

macOS app distributed as `.app` bundle via Tauri. Requires:
- System Audio Recording permission (ScreenCaptureKit)
- Microphone permission (optional, for mic mode)
- Soniox API key (user-provided)

No auto-update mechanism currently implemented.
