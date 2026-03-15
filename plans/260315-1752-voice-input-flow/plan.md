# Voice Input Flow

**Feature:** Tray menu item + `Cmd+L` shortcut to open a voice input overlay that records mic → live STT → on "End" sends text to AI for translation to source language.

**Status:** Planning

## Overview

User presses `Cmd+L` (or tray item) → opens a small overlay window → mic captures audio → Soniox does live STT (no translation, just transcription in detected language) → user sees live text → presses "End" button → text is sent to AI service to translate into `settings.source_language` → result shown, then overlay closes or stays for copy.

## Phases

| # | Phase | Status | File |
|---|-------|--------|------|
| 1 | Add global shortcut plugin + tray item | Pending | [phase-01](phase-01-global-shortcut-and-tray.md) |
| 2 | Create voice input window + React app | Pending | [phase-02](phase-02-voice-input-window.md) |
| 3 | Voice input flow (mic → STT → AI translate) | Pending | [phase-03](phase-03-voice-input-logic.md) |

## Key Decisions

- **Global shortcut `Cmd+L`**: Need `tauri-plugin-global-shortcut` since shortcut must work when app is not focused
- **Separate window**: New small overlay `voice-input.html` (not reusing caption window)
- **STT mode**: Use Soniox in transcription-only mode (no translation) — we want raw speech text
- **Translation**: After user presses "End", send collected text to AI service `/chat` with prompt "Translate to {source_language}"
- **Window behavior**: Always-on-top, small floating overlay, auto-close after translation shown
