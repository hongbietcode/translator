---
phase: 3
title: "Voice Input State Machine"
status: completed
priority: P1
effort: 2h
completed: 2026-03-30
---

# Phase 3: Voice Input State Machine

## Context Links
- Current state: `src/voice-input-app.tsx` — uses simple string state `"recording" | "translating" | "result" | "error"`
- dtateks/stt: `bar-state-machine.ts` — formal HIDDEN/LISTENING/PROCESSING/INSERTED/ERROR

## Overview

Replace the ad-hoc string state in `voice-input-app.tsx` with a formal state machine hook. The new machine handles the full pipeline: idle -> listening -> finalizing -> correcting -> inserting -> done, with error recovery at each step.

## Key Insights

- Current code mixes state transitions with side effects — hard to reason about
- dtateks/stt state machine is clean but uses vanilla JS; we adapt to React hook pattern
- State machine should be the single source of truth for voice input flow
- Each state transition should trigger exactly one side effect

## Requirements

### Functional
- Define states: IDLE, LISTENING, FINALIZING, CORRECTING, INSERTING, DONE, ERROR
- Define valid transitions (no invalid state jumps)
- Each state maps to UI rendering in `voice-input-overlay.tsx`
- Error state includes error message and retry capability

### Non-Functional
- Type-safe transitions (TypeScript discriminated union)
- Testable without DOM

## Architecture

```
State Machine Flow:

    IDLE ──(hotkey)──► LISTENING ──(stop/end)──► FINALIZING
                           │                         │
                           │ (error)                 │ (transcript ready)
                           ▼                         ▼
                         ERROR ◄── (any error) ── CORRECTING (if LLM enabled)
                           │                         │
                           │                         ▼
                           │                     INSERTING
                           │                         │
                           │                         ▼
                           └──────────────────── DONE ──(auto-close)──► IDLE
```

## Related Code Files

### Create
- `src/hooks/use-voice-input-state-machine.ts` — state machine hook

### Modify
- `src/voice-input-app.tsx` — consume new state machine hook
- `src/components/voice-input-overlay.tsx` — render based on new states

## Implementation Steps

1. Create `use-voice-input-state-machine.ts`:
   ```typescript
   type VoiceInputState =
     | { phase: "idle" }
     | { phase: "listening"; transcript: string; provisional: string }
     | { phase: "finalizing"; transcript: string }
     | { phase: "correcting"; transcript: string }
     | { phase: "inserting"; text: string }
     | { phase: "done"; text: string }
     | { phase: "error"; message: string; canRetry: boolean };

   type VoiceInputAction =
     | { type: "START_LISTENING" }
     | { type: "UPDATE_TRANSCRIPT"; transcript: string; provisional: string }
     | { type: "STOP_LISTENING" }
     | { type: "TRANSCRIPT_READY"; transcript: string }
     | { type: "CORRECTION_DONE"; text: string }
     | { type: "INSERTION_DONE"; text: string }
     | { type: "ERROR"; message: string; canRetry: boolean }
     | { type: "RESET" };
   ```

2. Implement `useReducer`-based hook with transition validation

3. Refactor `voice-input-app.tsx`:
   - Replace `useState<VoiceInputState>` with the new state machine
   - Move side effects (audio start/stop, Soniox connect/disconnect, LLM call, text insertion) to `useEffect` blocks that react to state changes
   - Each state transition triggers cleanup of previous state's resources

4. Update `voice-input-overlay.tsx`:
   - Map new states to UI: listening (red dot + live text), finalizing (spinner), correcting (spinner + "Correcting..."), inserting (spinner + "Inserting..."), done (checkmark + auto-close), error (message + retry button)

## Todo List

- [x] Define state and action types
- [x] Implement reducer with transition validation
- [x] Create `useVoiceInputStateMachine` hook
- [x] Refactor `voice-input-app.tsx` to use new hook
- [x] Update `voice-input-overlay.tsx` for new states
- [x] Add auto-close timer for DONE state (1s delay)

## Success Criteria

- All voice input states are represented in the state machine
- No invalid state transitions possible
- UI correctly reflects each state
- Error state shows meaningful message with retry option
- DONE state auto-closes window after brief delay
- Side effects (audio, WebSocket, LLM) properly triggered by state changes
