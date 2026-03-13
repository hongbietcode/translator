# System Architecture — Personal Translator

**Last Updated:** 2026-03-14
**Architecture Pattern:** Event-Driven, React Hooks + Tauri IPC
**Deployment Target:** macOS (13+)

## System Overview

Personal Translator is a single-window Tauri desktop application with a React 19 frontend and Rust backend. It operates in an overlay paradigm: minimal, always-visible UI that captures system/microphone audio and streams it to Soniox for real-time speech-to-text and translation.

```
┌─────────────────────────────────────────────────────────────────┐
│                     macOS Host Environment                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────┐                          │
│  │     React 19 Frontend Layer      │                          │
│  │  (src/components, src/hooks)     │                          │
│  └────────────────┬─────────────────┘                          │
│                   │ Tauri IPC (JSON)                           │
│  ┌────────────────▼─────────────────┐                          │
│  │    Tauri 2 Runtime & Commands    │                          │
│  │  (src-tauri/src/commands)        │                          │
│  └────────────────┬─────────────────┘                          │
│                   │                                             │
│  ┌────────────────▼─────────────────┐                          │
│  │     Rust Backend Services        │                          │
│  │  • ScreenCaptureKit (system)     │                          │
│  │  • AVFoundation (microphone)     │                          │
│  │  • Audio resampling (48→16kHz)   │                          │
│  │  • Settings persistence          │                          │
│  │  • Transcript file I/O           │                          │
│  └────────────────┬─────────────────┘                          │
│                   │ PCM Audio (WebSocket)                      │
│                   │ Events (JSON)                              │
│                   │                                             │
│  ┌────────────────▼──────────────────────────────────────┐     │
│  │          Network / External Services                  │     │
│  ├──────────────────────────────────────────────────────┤     │
│  │ • Soniox API v4 (WebSocket) — STT + Translation      │     │
│  │ • System Audio APIs (ScreenCaptureKit, AVFoundation) │     │
│  │ • User file system (settings, transcripts)           │     │
│  └───────────────────────────────────────────────────────┘     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Layered Architecture

### Layer 1: Presentation (React Components)

**Purpose:** Render UI state, capture user input, display real-time translations.

**Components:**
- `OverlayView` — Main translating display (segments, provisional text, controls)
- `SettingsView` — Configuration form (API key, languages, audio source, styling)
- `HistoryView` — Session archive browser and export interface
- `TitleBar` — macOS window chrome (close, minimize, maximize)
- `SourceSelector` — Audio source radio picker
- `TranscriptDisplay` — Renderer for transcript segments with speaker labels
- `Toast` — Non-blocking notification system

**Responsibility:**
- React to state changes from hooks
- Emit user actions (click, input change) to event handlers
- Handle keyboard shortcuts (Cmd+Enter, Cmd+,, Esc)
- No business logic or side effects

**Key Principle:** Components are pure functions. All state and side effects live in custom hooks.

---

### Layer 2: Business Logic (Custom Hooks)

**Purpose:** Encapsulate domain logic, manage async operations, bridge frontend and backend.

#### Hook: `useSettings`
```typescript
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Load settings from Rust backend on mount
    invoke<Settings>("get_settings")
      .then((s) => setSettings({ ...DEFAULT_SETTINGS, ...s }))
      .finally(() => setIsLoading(false));
  }, []);

  const updateSettings = useCallback(async (newSettings: Partial<Settings>) => {
    const merged = { ...settings, ...newSettings };
    await invoke("save_settings", { newSettings: merged });
    setSettings(merged);
  }, [settings]);

  return { settings, updateSettings, isLoading };
}
```
**Manages:** Settings state, Tauri IPC, persistence.

#### Hook: `useAudioCapture`
```typescript
export function useAudioCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const onAudioDataRef = useRef<(pcm: Uint8Array) => void>(() => {});

  const startCapture = useCallback(async (source: string, device: string | null) => {
    try {
      // Subscribe to audio_data events from Rust
      const unlisten = await listen<number[]>("audio_data", (event) => {
        const pcm = new Uint8Array(event.payload);
        onAudioDataRef.current(pcm);
      });

      // Invoke Rust command
      await invoke("start_capture", { source, device });
      setIsCapturing(true);
    } catch (err) {
      throw new Error(`Audio capture failed: ${err}`);
    }
  }, []);

  const stopCapture = useCallback(async () => {
    await invoke("stop_capture");
    setIsCapturing(false);
  }, []);

  const setOnAudioData = useCallback((callback: (pcm: Uint8Array) => void) => {
    onAudioDataRef.current = callback;
  }, []);

  return { startCapture, stopCapture, setOnAudioData, isCapturing };
}
```
**Manages:** Audio capture lifecycle, event subscription, PCM callbacks.

#### Hook: `useSoniox`
```typescript
export function useSoniox() {
  const clientRef = useRef<SonioxWebSocketClient>(new SonioxWebSocketClient());
  const [status, setStatus] = useState<SonioxStatus>("disconnected");
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);

  useEffect(() => {
    const client = clientRef.current;

    client.onStatusChange = (s) => setStatus(s);
    client.onTranslation = (text) => {
      setSegments((prev) => {
        // Update latest segment with translation
        const next = [...prev];
        const idx = next.findIndex((s) => s.status === "original");
        if (idx >= 0) {
          next[idx] = { ...next[idx], translation: text, status: "translated" };
        }
        return cleanupSegments(next);
      });
    };
  }, []);

  const connect = useCallback((config: SonioxConfig) => {
    clientRef.current.connect(config);
  }, []);

  return {
    status,
    segments,
    provisionalText,
    connect,
    disconnect,
    sendAudio,
    clearSegments,
    onTranslationRef,
    onErrorRef,
  };
}
```
**Manages:** WebSocket connection lifecycle, transcription state, segment cleanup.

#### Hook: `useHistory`
```typescript
export function useHistory() {
  const [sessions, setSessions] = useState<TranscriptSession[]>([]);

  const startSession = useCallback((source: string, srcLang: string, tgtLang: string) => {
    // Create new session object
    const session = { id: Date.now(), source, srcLang, tgtLang, segments: [], createdAt: new Date() };
    setSessions((prev) => [session, ...prev]);
  }, []);

  const addEntry = useCallback((text: string) => {
    setSessions((prev) => {
      const session = prev[0];
      if (!session) return prev;
      return [
        { ...session, segments: [...session.segments, text] },
        ...prev.slice(1),
      ];
    });
  }, []);

  const endSession = useCallback(async () => {
    const session = sessions[0];
    if (!session) return;

    // Persist to file
    const filename = `translator_${session.createdAt.toISOString().split("T")[0]}.txt`;
    await invoke("save_transcript", { filename, content: session.segments.join("\n") });
  }, [sessions]);

  return { sessions, startSession, addEntry, endSession, clear: () => setSessions([]) };
}
```
**Manages:** Session lifecycle, local history, persistence.

#### Hook: `useTranscript`
```typescript
export function useTranscript() {
  const [transcript, setTranscript] = useState<string>("");

  const appendTranscript = useCallback((text: string) => {
    setTranscript((prev) => prev + (prev ? " " : "") + text);
  }, []);

  return { transcript, appendTranscript, clear: () => setTranscript("") };
}
```
**Manages:** Current session transcript (display text only, not persisted).

#### Hook: `useInputDevices`
```typescript
export function useInputDevices() {
  const [devices, setDevices] = useState<InputDevice[]>([]);

  useEffect(() => {
    invoke<InputDevice[]>("get_input_devices")
      .then(setDevices)
      .catch(console.error);
  }, []);

  return { devices };
}
```
**Manages:** Available microphone device enumeration.

---

### Layer 3: Infrastructure (Tauri IPC Bridge)

**Purpose:** Define command and event contracts between React and Rust.

#### Commands (Rust → React)

| Command | Input | Output | Purpose |
|---------|-------|--------|---------|
| `get_settings` | — | `Settings` | Load user configuration |
| `save_settings` | `Settings` | — | Persist settings to disk |
| `start_capture` | `{ source, device }` | — | Begin audio capture stream |
| `stop_capture` | — | — | Stop audio capture |
| `get_input_devices` | — | `InputDevice[]` | List available microphones |
| `save_transcript` | `{ filename, content }` | — | Write session to file |

#### Events (Rust → React)

| Event | Payload | Frequency | Purpose |
|-------|---------|-----------|---------|
| `audio_data` | `Uint8Array` (PCM) | ~50/sec (200ms chunks) | Stream audio samples |
| `menu-event` | `string` (event ID) | User interaction | Handle menu bar actions |

---

### Layer 4: Backend Services (Rust)

**Purpose:** Handle system integration, audio processing, file I/O, and external API calls.

#### Audio Capture Module (`src/audio/`)

**System Audio** (`system_audio.rs`)
- Uses `ScreenCaptureKit` (macOS 13+)
- Captures stereo audio at 48 kHz
- Resamples to 16 kHz mono (Soniox requirement)
- Outputs PCM S16LE byte stream

**Microphone** (`microphone.rs`)
- Uses `AVFoundation` (AVAudioEngine)
- Captures directly at 16 kHz mono
- Requires microphone permission grant
- No resampling needed

#### Commands Module (`src/commands/`)

**Audio Commands** (`audio.rs`)
```rust
#[tauri::command]
pub async fn start_capture(
    source: String,
    device: Option<String>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    // Validate source
    match source.as_str() {
        "system" => SystemAudioCapture::start(app)?,
        "microphone" => MicrophoneCapture::start(&device, app)?,
        _ => return Err("Invalid source".into()),
    }
    Ok(())
}

#[tauri::command]
pub async fn stop_capture() -> Result<(), String> {
    // Stop active capture and emit final events
    Ok(())
}
```

**Settings Commands** (`settings.rs`)
```rust
#[tauri::command]
pub fn get_settings() -> Result<Settings, String> {
    // Load from ~/.config/personal-translator/settings.json
}

#[tauri::command]
pub fn save_settings(new_settings: Settings) -> Result<(), String> {
    // Persist to config file
}
```

**Transcript Commands** (`transcript.rs`)
```rust
#[tauri::command]
pub async fn save_transcript(filename: String, content: String) -> Result<(), String> {
    // Write to ~/.local/share/personal-translator/transcripts/{filename}
}
```

#### Settings Persistence (`settings.rs`)

```rust
pub struct Settings {
    pub soniox_api_key: String,
    pub source_language: String,
    pub target_language: String,
    pub audio_source: String,
    pub overlay_opacity: f32,
    pub font_size: i32,
    pub max_lines: i32,
    pub show_original: bool,
    pub custom_context: Option<CustomContext>,
}

// Serialized to JSON:
// {
//   "soniox_api_key": "sk_...",
//   "source_language": "auto",
//   "target_language": "vi",
//   "audio_source": "system",
//   "overlay_opacity": 0.85,
//   "font_size": 16,
//   "max_lines": 5,
//   "show_original": true,
//   "custom_context": null
// }
```

---

### Layer 5: External APIs & Services

#### Soniox WebSocket Client (`src/lib/soniox-websocket-client.ts`)

**Connection:**
```
wss://stt-rt.soniox.com/transcribe-websocket
```

**Handshake Message:**
```json
{
  "api_key": "sk_...",
  "model": "stt-rt-v4",
  "audio_format": "pcm_s16le",
  "language": "auto",
  "no_profanity_filter": false,
  "include_original": true,
  "include_translation": true,
  "translation_language": "vi",
  "domain_context": "...",
  "max_spoken_phrase_duration_ms": 60000,
  "max_transcript_size_tokens": 300
}
```

**Audio Streaming:**
- Send 16 kHz mono PCM S16LE as binary frames
- Batch every 200 ms (~6.4 KB per batch)
- Send empty frame to flush on disconnect

**Response Tokens:**
```typescript
interface SonioxToken {
  text: string;               // Transcribed/translated text
  is_final: boolean;          // Whether segment is final
  translation_status: "original" | "translation";
  speaker?: number;           // Speaker ID (multi-speaker detection)
}
```

**Session Auto-Reset:**
- Soniox resets session after 3 minutes of streaming
- Triggers automatic reconnect with same config
- Prevents context pollution from long sessions

---

## Data Flow Walkthrough

### Scenario: User Starts Transcription

```
User clicks [Play]
    │
    ▼
App.tsx: toggle() → start()
    │
    ├─► useAudioCapture.startCapture("system", null)
    │   └─► Tauri: invoke("start_capture", { source: "system", device: null })
    │       └─► Rust: start_capture() → SystemAudioCapture::start()
    │           └─► ScreenCaptureKit setup, PCM resampling starts
    │
    ├─► useSoniox.connect({ apiKey, sourceLanguage, targetLanguage })
    │   └─► SonioxWebSocketClient.connect()
    │       └─► new WebSocket("wss://...")
    │           └─► onopen → send handshake JSON + empty PCM frame
    │
    └─► useHistory.startSession("system", "auto", "vi")
        └─► Create new session object, add to state
```

### Scenario: Audio Arrives from System

```
Rust: ScreenCaptureKit emits 200ms PCM frame
    │
    ▼
SystemAudioCapture resamples (48kHz → 16kHz)
    │
    ▼
Tauri event: app.emit_all("audio_data", Uint8Array)
    │
    ▼
React: useAudioCapture listener fires
    │
    ▼
onAudioDataRef.current(pcm) → callback set by App.tsx
    │
    ▼
soniox.sendAudio(pcm.buffer)
    │
    ▼
SonioxWebSocketClient.sendAudio()
    │
    ▼
WebSocket.send(ArrayBuffer) → Soniox
```

### Scenario: Translation Received from Soniox

```
Soniox WebSocket receives token with is_final=true
    │
    ▼
SonioxWebSocketClient.onTranslation("Xin chào")
    │
    ▼
useSoniox state update:
    setSegments(prev => {
      prev[lastOriginalIdx].translation = "Xin chào"
      prev[lastOriginalIdx].status = "translated"
      return cleanupSegments(prev)
    })
    │
    ▼
React re-renders OverlayView with new segment
    │
    ▼
App callback: onTranslationRef.current("Xin chào")
    │
    ├─► appendTranscript("Xin chào") → useTranscript state
    │
    └─► history.addEntry("Xin chào") → useHistory state
        │
        ▼
        Update current session's segments array
```

---

## State Management Architecture

### State Hierarchy

```
App.tsx (orchestrator)
├─ currentView: "overlay" | "settings" | "history"
├─ isRunning: boolean
├─ currentSource: "system" | "microphone" | "both"
└─ currentDevice: string | null

useSettings()
├─ settings: Settings
└─ isLoading: boolean

useAudioCapture()
└─ isCapturing: boolean

useSoniox()
├─ status: SonioxStatus
├─ segments: TranscriptSegment[]
├─ provisionalText: string
└─ provisionalSpeaker: number | null

useHistory()
└─ sessions: TranscriptSession[]

useTranscript()
└─ transcript: string

useInputDevices()
└─ devices: InputDevice[]
```

**Key Principle:** State is lifted to the highest component/hook that needs it. Each hook manages its own domain, no prop drilling.

---

## Event Loop & Lifecycle

### Startup

1. `main.tsx` mounts `<App />`
2. `useSettings` hook loads settings from Rust (async)
3. `useSoniox` hook initializes WebSocket client (ready, not connected)
4. `useInputDevices` hook fetches microphone list
5. Components render with defaults until `isLoading=false`

### Runtime (Translating)

1. User clicks [Play] → `start()` fires
2. `startCapture()` + `soniox.connect()` happen in parallel
3. Audio data flows: Rust → Tauri event → React hook callback → sendAudio() → WebSocket
4. Soniox responses: WebSocket → client callback → useSoniox state update → React render
5. Segments accumulate in state, auto-cleanup when >1200 chars or >3 pending

### Shutdown (User clicks [Stop])

1. User clicks [Stop] → `stop()` fires
2. `stopCapture()` stops Rust audio stream
3. `soniox.disconnect()` closes WebSocket (sends empty frame first)
4. `history.endSession()` persists session to disk
5. State clears: segments=[], transcript=""

### App Close

1. `handleClose()` called
2. Save window position to localStorage
3. Call `stop()` to cleanup
4. `getCurrentWindow().close()` exits

---

## Concurrency & Async Model

### Frontend (React/JavaScript)

- Single-threaded, event-loop based
- `useCallback` for memoization and closure stability
- `useRef` for mutable objects (WebSocket client, callback refs)
- `async/await` for Tauri IPC
- Event listeners cleaned up in return of `useEffect`

### Backend (Rust/Tokio)

- Multi-threaded async runtime (Tokio)
- `ScreenCaptureKit` runs on main thread, yields PCM buffers
- `AVAudioEngine` runs on audio thread, real-time constraints
- Tauri commands are `async` to avoid blocking event loop
- Channels for inter-thread communication if needed

### IPC Model (Tauri)

- Command-based: Frontend calls `invoke()`, Rust responds with `Result<T, String>`
- Event-based: Rust calls `emit_all()`, frontend listens with `listen()`
- Serialization: JSON for settings/commands, binary for audio data
- No direct memory sharing (safe boundary)

---

## Error Boundaries & Recovery

### Audio Capture Failures

```
⚠️ startCapture() fails (e.g., permission denied)
    │
    ▼
App catches in try/catch → showToast("Audio error: ...")
    │
    ▼
stop() called automatically
    │
    ▼
User can retry with different source or grant permissions
```

### WebSocket Disconnection

```
⚠️ WebSocket closes unexpectedly
    │
    ▼
SonioxWebSocketClient.onclose triggered
    │
    ▼
Attempt reconnect (up to 3 tries, 2s backoff)
    │
    ├─► Success: resume audio streaming
    │
    └─► Failure: emit "error" event → show toast
        └─► User must click [Stop] manually to reset
```

### Settings Persistence Failure

```
⚠️ save_settings command fails (e.g., permission denied on config dir)
    │
    ▼
useSettings.updateSettings() rejects
    │
    ▼
App catches in try/catch → showToast("Settings save failed: ...")
    │
    ▼
Settings reverted to previous value (settingsRef not updated)
    │
    ▼
User must retry or verify file permissions
```

---

## Performance Characteristics

### Real-Time Constraints

| Operation | Budget | Typical | Margin |
|-----------|--------|---------|--------|
| Audio capture loop | 200 ms | 50 ms | 150 ms |
| PCM resampling | 200 ms | 20 ms | 180 ms |
| React re-render | 50 ms | 10 ms | 40 ms |
| WebSocket send | — | <1 ms | — |
| Soniox response latency | — | 500–1500 ms | — |

**Bottleneck:** Soniox API latency (network-bound, not CPU-bound).

### Memory

- Segment cleanup caps total state at ~1200 chars
- No memory leaks from uncleared event listeners (cleanup in useEffect)
- WebSocket client maintains one connection (not one per render)

### Scaling

- Single-window app, fixed concurrency
- No multi-tab or worker threads
- Soniox session limits handled by auto-reset after 3 mins

---

## Testing Strategy

### Unit Tests (Frontend)

- Test hooks in isolation: `useSettings`, `useSoniox`, `useHistory`
- Mock Tauri IPC with Jest mocks
- Mock WebSocket client
- Verify state transitions, callbacks, cleanup

### Integration Tests (Components)

- Test component + hook integration
- Mock Tauri events
- Verify renders and user interactions

### E2E Tests (Full App)

- Run against real Tauri app
- Verify audio capture pipeline
- Verify settings persistence
- Verify Soniox connection (if API key available)

### Manual Testing

- Audio source switching (while running)
- Permission denial scenarios
- Window drag/resize/close
- Settings save/load
- History export

---

## Security Model

### API Key Management

- Stored in `~/.config/personal-translator/settings.json`
- Not sent to GitHub or logs
- Validated before use in `start()`
- Soniox terms: rate limited, usage monitored

### Permissions

- **ScreenCaptureKit:** Requires "Screen & System Audio Recording" entitlement
- **Microphone:** Requires microphone permission (macOS privacy panel)
- **File I/O:** Confined to home directory (~/.config, ~/.local/share)

### Data Privacy

- Audio never leaves device except to Soniox
- No analytics or telemetry
- No tracking cookies
- Transcripts stored locally (user can delete)
- Soniox privacy policy applies to their server

---

## Deployment & Packaging

### Build Process

```bash
npm run build          # TypeScript + Vite
cargo build -r        # Rust backend
npm run tauri build   # Package into .app
```

Output: `Personal Translator.app` (signed with dev identity for testing, requires signing for distribution)

### Distribution

- Not currently on App Store
- Manual download + code-signing needed for distribution
- Users must grant System Audio Recording + Microphone permissions on first launch

### Updates

- No auto-update mechanism yet
- Users must manually download new versions
- Settings persist across app updates (backward-compatible format required)

