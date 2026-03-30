# Code Standards — Personal Translator

**Last Updated:** 2026-03-30
**Applies To:** Frontend (React/TypeScript), Backend (Rust)

## Frontend Code Standards (React 19 + TypeScript)

### File Organization

#### Component Files (`.tsx`)
```
src/components/
├── overlay-view.tsx            # Main translation display
├── settings-view.tsx           # Settings configuration
├── voice-input-overlay.tsx     # Voice recording visual feedback (NEW)
├── history-view.tsx            # Session archive
└── ...
```

**File naming rule:** Use kebab-case file names (lowercase with hyphens), exported component is PascalCase.
**New component (v0.2.0):** `VoiceInputOverlay` shows recording state during voice input.

Example:
```typescript
// src/components/overlay-view.tsx
export default function OverlayView() { ... }
```

#### Hook Files (`.ts`)
```
src/hooks/
├── use-settings.ts             # Settings state management
├── use-audio-capture.ts        # Audio capture lifecycle
├── use-soniox.ts               # WebSocket client for STT/translation
├── use-voice-input-state-machine.ts  # Voice recording state (NEW v0.2.0)
├── use-history.ts              # Session history management
└── ...
```

**Rule:** Custom hooks start with `use-` prefix, kebab-case filename.
**New hook (v0.2.0):** `useVoiceInputStateMachine` orchestrates voice input workflow.

#### Utility & Library Files (`.ts`)
```
src/lib/
├── soniox-websocket-client.ts  # WebSocket client for Soniox API
├── stop-word-detection.ts      # Stop word detector (NEW v0.2.0)
├── utils.ts                    # General utilities
└── ...
```

**New utility (v0.2.0):** `stop-word-detection.ts` detects configured stop words in transcript stream.

#### Types/Interfaces (`.ts`)
```
src/types/
├── settings.ts                 # Type definitions, kebab-case filename
└── ...
```

### Component Structure

**Preferred pattern:**
```typescript
import { useState, useCallback } from "react";
import type { ComponentProps } from "react";
import { useSettings } from "@/hooks/use-settings";
import { SomeChild } from "@/components/some-child";

// Props interface at top
interface OverlayViewProps {
  segments: TranscriptSegment[];
  onClear: () => void;
  // ...
}

// Main component
export default function OverlayView(props: OverlayViewProps) {
  const { segments, onClear } = props;
  const [state, setState] = useState<string>("");

  const handleClick = useCallback(() => {
    // ...
  }, [segments]); // explicit deps

  return (
    <div className="...">
      <SomeChild />
    </div>
  );
}
```

**Guidelines:**
- Define props interface immediately above component
- Use named exports for utilities, default export for components
- Keep components under 300 lines; split if larger
- Props destructuring in signature (except for many props)
- Use `useCallback` for event handlers (prevent child re-renders)
- Use `useRef` for Tauri callbacks, WebSocket refs (mutable data)

### State Management

**Local component state:**
```typescript
const [count, setCount] = useState(0);
const [items, setItems] = useState<Item[]>([]);
```

**Global/cross-component state:**
Use custom hooks that return state + setters. Example:
```typescript
// src/hooks/use-settings.ts
export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT);
  // business logic...
  return { settings, updateSettings };
}

// Usage in component
function SettingsView() {
  const { settings, updateSettings } = useSettings();
  // ...
}
```

**Avoid:**
- Context API for performance-sensitive data (causes re-renders)
- Global variables or singletons
- Prop drilling (use hooks instead)

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | kebab-case | `use-settings.ts`, `overlay-view.tsx` |
| Components | PascalCase | `OverlayView`, `SettingsView` |
| Functions | camelCase | `handleClick`, `onTranslation` |
| Constants | UPPER_SNAKE_CASE | `MAX_RECONNECT`, `SESSION_DURATION_MS` |
| Variables | camelCase | `isRunning`, `currentSource` |
| Interfaces | PascalCase | `Settings`, `TranscriptSegment` |
| Event handlers | `on{Action}` | `onClick`, `onTranslation`, `onError` |
| Hooks | `use{Feature}` | `useSettings`, `useSoniox` |
| Booleans | `is{State}` or `has{Feature}` | `isRunning`, `hasPermission` |

### Typing Best Practices

**Always type function signatures:**
```typescript
// Good
function process(input: string, max: number): Promise<string> {
  // ...
}

// Bad — no return type
function process(input: string, max: number) {
  // ...
}
```

**Use `type` for unions, `interface` for objects:**
```typescript
// Union
type AudioSource = "system" | "microphone" | "both";

// Object contract
interface Settings {
  soniox_api_key: string;
  // ...
}
```

**Avoid `any` type:**
```typescript
// Bad
function parse(data: any): any { ... }

// Good
function parse(data: unknown): ParseResult { ... }
```

**Use `type` imports where possible:**
```typescript
import type { Settings } from "@/types/settings";
import { useSettings } from "@/hooks/use-settings"; // runtime import
```

### React Hooks Rules

1. **Call hooks at top level** — never inside conditions or loops
2. **Only call hooks from React components or custom hooks**
3. **Document dependencies in `useCallback`, `useEffect`, `useMemo`**
   ```typescript
   useCallback(() => {
     // only access items inside
   }, [items]); // items in dependency array
   ```
4. **Use `useRef` for:**
   - Storing mutable values (refs.current)
   - Accessing DOM directly (rare)
   - Callbacks to avoid stale closures
5. **Avoid creating hooks conditionally:**
   ```typescript
   // Bad
   if (feature) {
     const hook = useCustom();
   }

   // Good
   const hook = useCustom();
   if (feature) {
     // use hook
   }
   ```

### Error Handling

**For async operations:**
```typescript
const handleSave = useCallback(async () => {
  try {
    const result = await invoke("save_settings", { ... });
    showToast("Saved", "success");
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    showToast(message, "error");
  }
}, []);
```

**For event callbacks:**
```typescript
const handleAudioCapture = (data: Uint8Array) => {
  try {
    soniox.sendAudio(data.buffer);
  } catch (err) {
    console.error("Failed to send audio:", err);
    showToast("Audio send failed", "error");
  }
};
```

**For external API calls:**
```typescript
useEffect(() => {
  const timer = setTimeout(async () => {
    try {
      const devices = await invoke<string[]>("get_input_devices");
      setDevices(devices);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    }
  }, 1000);

  return () => clearTimeout(timer);
}, []);
```

### Styling with Tailwind CSS v4

**Use utility classes in JSX:**
```typescript
<div className="flex items-center justify-between bg-zinc-900 p-4 rounded-lg">
  <span className="text-white text-sm font-medium">Status</span>
  <button className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded">
    Click
  </button>
</div>
```

**Avoid:**
- Inline styles (unless dynamic)
- CSS modules (use Tailwind instead)
- `classname` library (use `clsx` from `clsx` package if conditional)

**For dynamic classes:**
```typescript
import clsx from "clsx";

<div className={clsx(
  "flex gap-2",
  isActive && "bg-blue-600",
  isDisabled && "opacity-50 cursor-not-allowed"
)}>
```

**CSS variables (theme):**
```css
/* globals.css */
:root {
  --overlay-opacity: 0.85;
  --font-size-base: 16px;
}
```

```typescript
<div style={{
  opacity: `var(--overlay-opacity)`,
  fontSize: `var(--font-size-base)`,
}}>
```

### Comments & Documentation

**Avoid obvious comments:**
```typescript
// Bad
const isRunning = false; // set running to false

// Good
// Maintain "running" state separately to handle async stop() cleanup
const isRunningRef = useRef(false);
```

**Document complex logic:**
```typescript
// Soniox sessions auto-reset after 3 mins of inactivity.
// We close + reconnect to avoid stale context bleeding.
useEffect(() => {
  const timer = setTimeout(() => {
    if (isRunningRef.current) {
      soniox.disconnect();
      soniox.connect(config);
    }
  }, SESSION_DURATION_MS);

  return () => clearTimeout(timer);
}, [config, soniox]);
```

**JSDoc for public functions:**
```typescript
/**
 * Connects to Soniox WebSocket with given config.
 * Auto-reconnects up to 3 times on failure.
 *
 * @param config - Soniox connection config (apiKey, languages)
 * @throws Error if apiKey is missing
 */
export function connect(config: SonioxConfig) {
  // ...
}
```

---

## Backend Code Standards (Rust)

### File Organization

```
src-tauri/src/
├── audio/
│   ├── mod.rs                  # Public exports (system_audio, microphone)
│   ├── system_audio.rs         # ScreenCaptureKit wrapper
│   └── microphone.rs           # AVFoundation wrapper
├── commands/
│   ├── mod.rs                  # Command module exports
│   ├── audio.rs                # start_capture, stop_capture
│   ├── settings.rs             # get_settings, save_settings
│   ├── transcript.rs           # save_transcript
│   ├── text_inserter.rs        # insert_text_at_cursor (NEW v0.2.0)
│   ├── global_shortcut.rs      # register_hotkey, unregister_hotkey (NEW v0.2.0)
│   └── llm_correction.rs       # correct_transcript (NEW v0.2.0)
├── settings.rs                 # Settings struct + persistence logic (9 new fields)
├── lib.rs                      # Crate root
└── main.rs                     # Tauri app entry
```

**Rule:** Use snake_case for all Rust files (Rust ecosystem convention).
**New commands (v0.2.0):** Text insertion, global hotkey management, LLM correction integration.

### Module Exports

**`mod.rs` pattern:**
```rust
// src/audio/mod.rs
pub mod system_audio;
pub mod microphone;

pub use self::system_audio::SystemAudioCapture;
pub use self::microphone::MicrophoneCapture;
```

### Naming Conventions

| Item | Convention | Example |
|------|-----------|---------|
| Files | snake_case | `system_audio.rs`, `microphone.rs` |
| Modules | snake_case | `mod audio` |
| Structs | PascalCase | `SystemAudioCapture`, `Settings` |
| Functions | snake_case | `start_capture`, `get_settings` |
| Constants | UPPER_SNAKE_CASE | `SAMPLE_RATE`, `MAX_BUFFER_SIZE` |
| Methods | snake_case | `.capture()`, `.save()` |
| Variables | snake_case | `audio_format`, `buffer_size` |

### Tauri Command Pattern

**Command definition:**
```rust
// src/commands/audio.rs
#[tauri::command]
pub async fn start_capture(
    source: String,
    device: Option<String>,
    app: tauri::AppHandle,
) -> Result<(), String> {
    // Validate input
    if source.is_empty() {
        return Err("Source cannot be empty".into());
    }

    // Call backend logic
    let capture = SystemAudioCapture::new(&source)?;

    // Emit events to frontend
    app.emit_all("audio_data", &pcm_bytes)
        .map_err(|e| e.to_string())?;

    Ok(())
}
```

**Rules:**
- All errors return `Result<T, String>` (Tauri serializes to JS)
- Use descriptive error messages
- Validate inputs early
- Emit events for long-running operations
- Use `async` for blocking operations (audio capture)

### Error Handling

**Propagate with context:**
```rust
// Good
fn load_settings() -> Result<Settings, String> {
    let path = get_config_path()
        .map_err(|e| format!("Failed to determine config path: {}", e))?;

    let content = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read settings from {}: {}", path.display(), e))?;

    serde_json::from_str(&content)
        .map_err(|e| format!("Invalid settings JSON: {}", e))
}
```

**Avoid silent failures:**
```rust
// Bad
let _ = app.emit_all("audio_data", &data);

// Good
app.emit_all("audio_data", &data)
    .map_err(|e| eprintln!("Failed to emit audio_data: {}", e))?;
```

### Type Safety

**Use strong types:**
```rust
// Bad
fn set_sample_rate(rate: i32) { ... }

// Good
#[derive(Copy, Clone, Debug)]
pub enum SampleRate {
    Rate16k = 16000,
    Rate48k = 48000,
}

fn set_sample_rate(rate: SampleRate) { ... }
```

**Use `Option<T>` and `Result<T, E>`:**
```rust
// Device might not be specified
fn start_capture(source: &str, device: Option<&str>) -> Result<(), String> {
    let device_name = device.unwrap_or("default");
    // ...
}
```

### Comments & Documentation

**Document public APIs:**
```rust
/// Starts audio capture from the specified source.
///
/// # Arguments
/// * `source` - Audio source: "system" or "microphone"
/// * `device` - Optional device ID (for microphone source)
///
/// # Errors
/// Returns error if source is invalid or permissions are denied.
///
/// # Events
/// Emits "audio_data" events with PCM bytes as app events.
pub async fn start_capture(
    source: String,
    device: Option<String>,
) -> Result<(), String> { ... }
```

**Avoid obvious comments:**
```rust
// Bad
let x = 16000; // sample rate is 16000

// Good
const SONIOX_SAMPLE_RATE: u32 = 16000;
```

### Async/Await

**Use async for I/O-bound operations:**
```rust
#[tauri::command]
pub async fn save_settings(new_settings: Settings) -> Result<(), String> {
    // Async I/O to avoid blocking the Tauri runtime
    tokio::fs::write(
        settings_path(),
        serde_json::to_string_pretty(&new_settings)?
    ).await
    .map_err(|e| e.to_string())
}
```

**Don't over-use async:**
```rust
// Bad — CPU-bound operation doesn't need async
pub async fn compute_hash(data: &[u8]) -> String {
    // ...
}

// Good
pub fn compute_hash(data: &[u8]) -> String {
    // ...
}
```

### Testing

**Use `#[cfg(test)]` modules:**
```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_audio_format() {
        let fmt = parse_audio_format("pcm_s16le");
        assert_eq!(fmt.unwrap(), AudioFormat::PcmS16Le);
    }
}
```

---

## Shared Standards

### Linting & Formatting

**Frontend:**
```bash
npx prettier --check src/
npx tsc --noEmit
```

**Backend:**
```bash
cargo clippy -- -D warnings
cargo fmt --check
```

### Git Commit Messages

**Use conventional commits:**
```
feat: add overlay transparency setting
fix: handle missing API key gracefully
docs: update architecture diagram
refactor: consolidate audio capture logic
test: add unit tests for useSoniox hook
chore: upgrade Tailwind CSS to v4
```

**Format:**
- Type: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`
- Scope (optional): `(settings)`, `(audio)`, etc.
- Message: imperative, lowercase, no period
- Body: explain *why*, not *what*

### Pull Requests

**Before pushing:**
1. Run linter & type checker
2. Run tests (if any)
3. Verify code compiles/builds
4. Self-review changes
5. Check for console logs / debug code

**PR description:**
```markdown
## What
Brief description of changes.

## Why
Explain the motivation and context.

## Testing
Describe how changes were tested.

## Checklist
- [ ] Linting passes
- [ ] No console.log / debug code
- [ ] TypeScript compiles
- [ ] Builds successfully
```

### Security

**Sensitive data:**
- Never commit `.env`, API keys, or credentials
- Use environment variables + `.env.example` template
- Validate all user input before passing to Soniox API
- Sanitize file paths before I/O operations

**Code review focus:**
- IPC boundaries (Rust ↔ JavaScript)
- Error messages (don't leak system paths)
- Async operation cancellation
- Resource cleanup (files, timers, WebSocket)

### Performance

**Frontend:**
- Memoize expensive computations with `useMemo`
- Use `useCallback` for event handlers
- Avoid re-renders with proper deps arrays
- Lazy-load components if >100KB

**Backend:**
- Use async/await for I/O, not busy loops
- Buffer audio in chunks (200ms) for streaming
- Clean up resources in drop/cleanup handlers
- Profile CPU usage for real-time audio

---

## Code Review Checklist

- [ ] Code follows naming conventions
- [ ] Types are complete (no `any`)
- [ ] Error handling is present and descriptive
- [ ] Comments explain *why*, not *what*
- [ ] No console.log or debug code
- [ ] Dependencies are necessary
- [ ] Performance impact is acceptable
- [ ] Security concerns addressed
- [ ] Tests pass (if applicable)
- [ ] Commit message is clear and follows convention

