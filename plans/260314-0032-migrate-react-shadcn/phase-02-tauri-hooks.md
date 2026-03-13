# Phase 2: Port Tauri IPC Hooks & Settings

## Priority: High | Status: Complete

## Overview

Create TypeScript hooks wrapping Tauri IPC commands: settings CRUD, audio capture start/stop, transcript persistence, input device listing.

## Steps

1. **Create `src/lib/tauri.ts`** — re-export `invoke` and `listen` from `@tauri-apps/api`

2. **Create `src/hooks/use-settings.ts`**
   - Port `settingsManager` logic as React hook
   - `useSettings()` returns `{ settings, updateSettings, isLoading }`
   - Calls `invoke("get_settings")` on mount
   - `updateSettings()` calls `invoke("save_settings", { newSettings })`
   - Store in React state, no global singleton

3. **Create `src/hooks/use-audio-capture.ts`**
   - `useAudioCapture()` returns `{ startCapture, stopCapture, isCapturing }`
   - `startCapture(source, device)` calls `invoke("start_capture", { source, device, channel })`
   - Creates Tauri `Channel` for receiving PCM data
   - Exposes `onAudioData` callback for PCM chunks
   - `stopCapture()` calls `invoke("stop_capture")`

4. **Create `src/hooks/use-history.ts`**
   - Port `HistoryManager` class as hook with `useState`
   - `useHistory()` returns `{ sessions, startSession, addEntry, endSession, clear, exportText }`

5. **Create `src/hooks/use-transcript.ts`**
   - Wraps `invoke("append_transcript", { text })` and `invoke("get_transcript_path")`

6. **Create `src/hooks/use-input-devices.ts`**
   - `useInputDevices()` calls `invoke("list_input_devices")` → `string[]`

7. **Type definitions** — `src/types/settings.ts`
   ```typescript
   interface Settings {
     soniox_api_key: string;
     source_language: string;
     target_language: string;
     audio_source: string;
     overlay_opacity: number;
     font_size: number;
     max_lines: number;
     show_original: boolean;
     custom_context: { domain: string; terms: string[] } | null;
   }
   ```

## Success Criteria

- [ ] All Tauri commands have typed TS wrappers
- [ ] Settings load/save round-trips correctly
- [ ] Audio capture Channel receives PCM data

## Related Files

- `src/hooks/use-settings.ts` — new
- `src/hooks/use-audio-capture.ts` — new
- `src/hooks/use-history.ts` — new
- `src/hooks/use-transcript.ts` — new
- `src/hooks/use-input-devices.ts` — new
- `src/types/settings.ts` — new
- `src/lib/tauri.ts` — new
