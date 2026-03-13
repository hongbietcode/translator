# Phase 7: Test & Verify

## Priority: High | Status: Complete

## Overview

End-to-end verification of all features after migration.

## Test Checklist

- [ ] App launches with `npm run tauri dev`
- [ ] Settings: save API key, languages, display options → persists after restart
- [ ] System audio capture: start → translations appear in real-time
- [ ] Microphone capture: start → translations appear in real-time
- [ ] Source switching: system ↔ mic while running (auto-restart)
- [ ] Session reset: runs >3 min without interruption (system audio path)
- [ ] Speaker diarization: labels appear for different speakers
- [ ] History: sessions recorded, export copies to clipboard, clear works
- [ ] Transcript file: daily `.txt` file written to app data dir
- [ ] Keyboard shortcuts: ⌘Enter, ⌘,, Esc, ⌘H, ⌘1/2/3
- [ ] Menu bar: all menu items trigger correct actions
- [ ] Window: drag, resize, always-on-top, close saves position
- [ ] Opacity setting applies to overlay
- [ ] Font size / max lines settings work
- [ ] Error handling: invalid API key shows toast, no crash
- [ ] `npm run tauri build` produces working `.app`

## Success Criteria

- [ ] All checklist items pass
- [ ] No TypeScript errors
- [ ] No console errors during normal operation
