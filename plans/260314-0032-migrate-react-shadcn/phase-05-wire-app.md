# Phase 5: Wire Everything in App

## Priority: High | Status: Complete

## Overview

Connect all hooks and components in `App.tsx`. Implement view switching, menu event listening, and the full start/stop flow.

## Steps

1. **`src/App.tsx`** — main app component
   - State: `currentView` ('overlay' | 'settings' | 'history'), `currentSource`, `currentDevice`, `isRunning`
   - Wrap with `SonioxProvider` for mic mode
   - Initialize settings on mount
   - Render active view based on `currentView`

2. **Start/Stop flow**
   - Start: validate API key → set `isRunning` → start audio capture → connect Soniox
   - Stop: disconnect Soniox → stop audio capture → clear `isRunning`
   - System audio: `useAudioCapture.startCapture('system')` → PCM chunks → `soniox.sendAudio()`
   - Microphone: `useRecording.start()` (SDK handles everything)

3. **Menu events**
   - Listen to `menu-event` via `listen()` from `@tauri-apps/api/event`
   - Map menu IDs to actions (same as current `_listenMenuEvents`)

4. **Keyboard shortcuts**
   - Global `keydown` listener (same logic as current)
   - ⌘Enter → toggle, ⌘, → settings, Esc → back, ⌘H → history, ⌘1/2/3 → source

5. **Window management**
   - Save/restore window position via localStorage (same as current)
   - Close button: save position → stop → close window

6. **Settings apply**
   - On settings change: update opacity, transcript config, current source

7. **Transcript persistence**
   - On new translation: call `appendTranscript()` hook + `addEntry()` to history

## Success Criteria

- [ ] Full start → translate → stop flow works for system audio
- [ ] Full start → translate → stop flow works for microphone
- [ ] View switching works (overlay ↔ settings ↔ history)
- [ ] Menu events trigger correct actions
- [ ] Keyboard shortcuts work
- [ ] Settings persist across restarts

## Related Files

- `src/App.tsx` — new
- `src/main.tsx` — new (entry point)
