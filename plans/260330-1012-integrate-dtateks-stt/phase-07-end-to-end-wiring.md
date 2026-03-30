---
phase: 7
title: "End-to-End Wiring"
status: completed
priority: P1
effort: 1.5h
completed: 2026-03-30
---

# Phase 7: End-to-End Wiring

## Context Links
- Phase 1: text insertion backend
- Phase 2: LLM correction service
- Phase 3: state machine
- Phase 4: stop word detection
- Phase 5: customizable hotkey
- Phase 6: settings UI

## Overview

Wire all new features together in `voice-input-app.tsx` to create the complete pipeline: hotkey -> listening -> stop word/manual stop -> optional LLM correction -> text insertion at cursor. This phase connects all independent pieces.

## Architecture — Complete Pipeline

```
Global Hotkey (Phase 5)
    │
    ▼
State: LISTENING (Phase 3)
    │ Audio capture (existing) → Soniox STT (existing)
    │ Stop word check on each final segment (Phase 4)
    │
    ├── Stop word detected OR user presses Enter/button
    ▼
State: FINALIZING
    │ Stop audio + disconnect Soniox
    │
    ├── LLM correction enabled?
    │   ├── Yes ──► State: CORRECTING
    │   │           │ invoke("correct_transcript", ...) (Phase 2)
    │   │           ▼
    │   └── No ───► State: INSERTING
    │               │ invoke("insert_text_at_cursor", text, enter_mode) (Phase 1)
    │               ▼
    │           State: DONE
    │               │ Show checkmark, auto-close after 800ms
    │               ▼
    └───────► State: IDLE (window destroyed)
```

## Related Code Files

### Modify
- `src/voice-input-app.tsx` — main orchestrator, wire all features
- `src/components/voice-input-overlay.tsx` — render all states including new ones
- `src/hooks/use-soniox.ts` — add endpoint detection delay config pass-through

### Read (dependencies)
- `src/hooks/use-voice-input-state-machine.ts` (Phase 3)
- `src/lib/stop-word-detection.ts` (Phase 4)

## Implementation Steps

1. Update `voice-input-app.tsx` orchestration:
   - Replace old state with `useVoiceInputStateMachine()`
   - On mount: dispatch `START_LISTENING`, start audio + Soniox
   - On each final segment: check stop word, update transcript
   - On stop (manual or stop word): dispatch `STOP_LISTENING`, cleanup audio
   - After cleanup: check `llm_correction_enabled`
     - If yes: dispatch `TRANSCRIPT_READY`, invoke `correct_transcript`, then dispatch `CORRECTION_DONE`
     - If no: skip to insertion
   - Invoke `insert_text_at_cursor` with text and enter_mode setting
   - Dispatch `INSERTION_DONE`, show success, auto-close

2. Update Soniox connection config:
   - Pass `max_endpoint_delay_ms` from settings to WebSocket handshake
   - Currently hardcoded to 1500 in `soniox-websocket-client.ts`
   - Add as parameter to `SonioxConfig` interface

3. Update `voice-input-overlay.tsx`:
   - LISTENING: red dot + live transcript (existing, rename)
   - FINALIZING: spinner + "Processing..."
   - CORRECTING: spinner + "Correcting..."
   - INSERTING: spinner + "Inserting..."
   - DONE: checkmark + inserted text preview
   - ERROR: error message + "Retry" and "Close" buttons

4. Add error recovery:
   - ERROR state with canRetry flag
   - Retry button: dispatch RESET then START_LISTENING
   - All errors during pipeline caught and routed to ERROR state

5. Auto-close behavior:
   - DONE state triggers 800ms timer, then window destroy
   - User can close earlier with Escape

## Todo List

- [x] Wire state machine to voice-input-app.tsx
- [x] Integrate stop word detection in transcript accumulation
- [x] Add LLM correction step (conditional on settings)
- [x] Add text insertion invocation
- [x] Pass endpoint delay to Soniox config
- [x] Update overlay UI for all new states
- [x] Add error recovery (retry button)
- [x] Add auto-close on DONE state
- [x] Update tray menu shortcut label to show configured shortcut
- [x] End-to-end test: speak -> stop word -> correct -> insert

## Success Criteria

- Full pipeline works: speak -> auto-stop (or manual) -> optional correction -> insert at cursor
- UI shows correct state at each step with appropriate feedback
- Error at any step shows meaningful message with retry option
- Auto-close after successful insertion
- Settings changes take effect immediately (no app restart)
- Escape key cancels at any point

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Race conditions between states | UI confusion, double insertion | State machine prevents invalid transitions |
| LLM timeout blocks insertion | User waits too long | 5s timeout, fallback to uncorrected text |
| Window focus lost during insertion | Text goes to wrong app | Document: keep target app focused |
