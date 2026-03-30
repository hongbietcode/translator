---
phase: 6
title: "Settings & UI Integration"
status: completed
priority: P2
effort: 2h
completed: 2026-03-30
---

# Phase 6: Settings & UI Integration

## Context Links
- Current settings UI: `src/components/settings-view.tsx`
- Settings types: `src/types/settings.ts`

## Overview

Extend the settings UI with new voice input configuration options: LLM correction toggle, API key/URL/model, stop word, global hotkey, enter mode, and endpoint detection delay.

## Requirements

### Functional
- New "Voice Input" section in settings
- Fields: global hotkey recorder, stop word, enter mode toggle, endpoint delay slider
- New "LLM Correction" section (collapsible, disabled by default)
- Fields: enable toggle, API key, base URL, model name, language
- Shortcut recorder: capture key combination when focused

### Non-Functional
- Consistent with existing settings UI style
- Responsive validation (inline errors)

## Related Code Files

### Modify
- `src/components/settings-view.tsx` — add new sections
- `src/types/settings.ts` — already updated in previous phases

## Implementation Steps

1. Add "Voice Input" section after existing settings sections:
   - **Global Shortcut**: text input showing current shortcut, with "Record" button
     - On record: capture next key combination, display as formatted string
     - On save: call `update_voice_input_shortcut` command
   - **Stop Word**: text input (placeholder: "e.g., thank you")
   - **Enter Mode**: toggle switch with description "Press Enter after inserting text"
   - **Endpoint Detection Delay**: slider 500ms-3000ms (default 1500ms)

2. Add "LLM Correction" section (collapsed by default):
   - **Enable**: toggle switch
   - **API Key**: password input
   - **Base URL**: text input (default: https://api.openai.com/v1)
   - **Model**: text input (default: gpt-4o-mini)
   - **Language**: dropdown (Auto, English, Vietnamese)

3. Shortcut recorder component:
   - Listen for keydown when "Record" button active
   - Display modifier keys + key as formatted string (e.g., "Ctrl+Alt+V")
   - Validate shortcut format before saving
   - Cancel with Escape

4. Save all settings via existing `updateSettings` flow

## Todo List

- [x] Add Voice Input section to settings UI
- [x] Implement shortcut recorder component
- [x] Add LLM Correction section (collapsible)
- [x] Wire all new fields to settings save/load
- [x] Add validation for shortcut format
- [x] Add validation for API base URL format
- [x] Style consistently with existing settings sections

## Success Criteria

- All new settings visible and functional in settings window
- Shortcut recorder captures and displays key combinations
- LLM section collapses/expands cleanly
- Settings persist on save and reload correctly
- Invalid inputs show inline error messages
