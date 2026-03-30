---
title: "Integrate dtateks/stt features into Translator"
description: "Add text insertion, LLM post-processing, stop word detection, customizable hotkey, and state machine to voice input"
status: completed
priority: P1
effort: 14h
branch: feat/integrate-stt-features
tags: [voice-input, stt, text-insertion, llm]
created: 2026-03-30
completed: 2026-03-30
---

# Integrate dtateks/stt Features into Translator

## Gap Analysis

| Feature | Translator (current) | dtateks/stt | Action |
|---------|---------------------|-------------|--------|
| Soniox WebSocket STT | Has it (robust client) | Has it | Skip |
| Audio capture | cpal Rust (working) | Web Audio API worklet | **Keep cpal** - already works, no browser permission UX |
| LLM post-processing | Uses Anthropic for translation only | Multi-provider (xAI, Gemini, OpenAI) with retry | **Add** - grammar correction before insertion |
| Text insertion at cursor | Missing - only copies to clipboard | AppleScript + Accessibility API | **Add** - highest value feature |
| Stop word detection | Missing | Custom phrase ends recording | **Add** - hands-free UX |
| Customizable global hotkey | Hardcoded CmdOrCtrl+L | User-configurable with rollback | **Add** - user flexibility |
| Enter mode | Missing | Auto-press Enter after insert | **Add** - quick send in chat apps |
| State machine | Simple string state in React | Formal enum state machine | **Add** - cleaner flow, error recovery |
| Endpoint detection config | Hardcoded 1500ms | Configurable delay | **Add** - small settings addition |
| Soniox temp API key | Missing - raw key sent to browser | Server-side 1hr temp key | **Defer** - requires Soniox account-level API, low priority for personal app |
| Speaker diarization | Has it | Does not have it | Skip (already ahead) |
| Translation mode | Has it (Soniox built-in) | Does not have it | Skip (already ahead) |

## Architecture Decisions

1. **Text insertion via Rust** - New `text_inserter.rs` module using AppleScript + NSPasteboard. Matches dtateks/stt approach but adapted to our Rust backend (no new objc2 deps needed for AppleScript approach).

2. **LLM correction as optional step** - Add between STT finalization and text insertion. Support OpenAI-compatible API only (covers xAI, Gemini via proxy, local Ollama). YAGNI: single provider interface, not 3 separate ones.

3. **State machine in React** - TypeScript enum-based state machine in a dedicated hook. States: IDLE -> LISTENING -> FINALIZING -> CORRECTING -> INSERTING -> DONE | ERROR.

4. **Settings extension** - Add new fields to existing Settings struct. No new settings window; extend current settings UI.

5. **Keep cpal audio** - The Rust cpal approach is already working and avoids Web Audio API permission complexities. No change needed.

## Phases

| # | Phase | Est. | Status |
|---|-------|------|--------|
| 1 | [Text Insertion Backend](./phase-01-text-insertion-backend.md) | 3h | Complete |
| 2 | [LLM Correction Service](./phase-02-llm-correction-service.md) | 2h | Complete |
| 3 | [Voice Input State Machine](./phase-03-voice-input-state-machine.md) | 2h | Complete |
| 4 | [Stop Word Detection](./phase-04-stop-word-detection.md) | 1.5h | Complete |
| 5 | [Customizable Global Hotkey](./phase-05-customizable-global-hotkey.md) | 2h | Complete |
| 6 | [Settings & UI Integration](./phase-06-settings-ui-integration.md) | 2h | Complete |
| 7 | [End-to-End Wiring](./phase-07-end-to-end-wiring.md) | 1.5h | Complete |

## Dependencies

```
Phase 1 (text insertion) ─────────┐
Phase 2 (LLM correction) ────────┤
Phase 3 (state machine) ─────────┼──► Phase 7 (wiring)
Phase 4 (stop word) ──────────────┤
Phase 5 (hotkey) ─────────────────┤
Phase 6 (settings/UI) ────────────┘
```

Phases 1-6 are independent and can be parallelized. Phase 7 wires everything together.

## Out of Scope

- Soniox temporary API key generation (requires server-side infrastructure)
- Audio worklet migration (cpal works fine, no benefit to switching)
- Auto-update / single-instance plugins (separate concern)
- macOS Keychain storage (current settings.json is adequate for personal use)
