# Phase 2: Voice Input Window + React App

**Priority:** High | **Status:** Pending

## Overview

Create the HTML entry point and React component for the voice input overlay — a minimal floating window showing live transcription with an "End" button.

## Requirements

- Separate HTML entry (`voice-input.html`) + React root
- Frameless, compact overlay (400x200)
- Shows: live transcription text, recording indicator, "End" button
- Draggable via custom titlebar area
- After "End" pressed: shows translation result, then "Copy & Close" button

## UI States

1. **Recording** — pulsing red dot + live text + "End" button
2. **Translating** — spinner + "Translating..."
3. **Result** — translated text + "Copy & Close" button

## Files to Create

### `src-tauri/voice-input.html`
Minimal HTML like `caption.html` but pointing to voice-input entrypoint.

### `src/voice-input-main.tsx`
React root mount (mirrors `src/caption-main.tsx` pattern).

### `src/voice-input-app.tsx`
Main component with:
- `useSettings()` for API keys and language config
- `useAudioCapture()` for mic recording
- `useSoniox()` for live STT (transcription-only mode, no translation)
- `useAiService()` for translation on "End"
- State machine: `idle → recording → translating → result`

### `src/components/voice-input-overlay.tsx`
Presentational component:
- Recording state: red dot animation, growing text area, "End" button
- Translating state: loading spinner
- Result state: translated text, "Copy & Close" button

### CSS
Add styles to existing `components.css`:
- `.voice-input-overlay` — compact layout
- `.voice-input-status` — recording indicator
- `.voice-input-result` — result display

## Related Files

- `src-tauri/voice-input.html` (create)
- `src/voice-input-main.tsx` (create)
- `src/voice-input-app.tsx` (create)
- `src/components/voice-input-overlay.tsx` (create)
- `src/styles/components.css` (edit)
- `vite.config.ts` (add voice-input entry if multi-page)
- `src-tauri/tauri.conf.json` (may need window config)

## Todo

- [ ] Create `voice-input.html` entry
- [ ] Create `voice-input-main.tsx` React root
- [ ] Create `voice-input-app.tsx` main logic component
- [ ] Create `voice-input-overlay.tsx` presentational component
- [ ] Add CSS styles for voice input overlay
- [ ] Configure Vite multi-page entry if needed
