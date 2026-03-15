# Phase 3: Voice Input Logic (Mic → STT → AI Translate)

**Priority:** High | **Status:** Pending

## Overview

Wire the full flow: mic capture → Soniox transcription-only → accumulate text → on "End" send to AI for translation → show result.

## Data Flow

```
Cmd+L → open window → auto-start mic capture
  → PCM audio → Soniox (transcription-only, no translation target)
  → live text displayed in overlay
  → user clicks "End"
  → stop mic + disconnect Soniox
  → collected text → AI service: "Translate to {source_language}: {text}"
  → stream response into result area
  → user clicks "Copy & Close" → clipboard + close window
```

## Key Implementation Details

### Soniox Config for Transcription-Only

Use existing `SonioxWebSocketClient` but configure WITHOUT translation:
```ts
soniox.connect({
  apiKey: settings.soniox_api_key,
  sourceLanguage: "auto",  // detect what user speaks
  targetLanguage: "",       // no translation — transcription only
  customContext: null,
});
```

Need to check if `SonioxWebSocketClient` handles empty `targetLanguage` — may need minor adjustment to skip translation config when target is empty.

### Text Accumulation

Collect all finalized segments into a single string. `provisionalText` shown live but not included in final output until finalized.

### AI Translation Prompt

```
Translate the following text to {language_name}.
Only output the translation, nothing else.

{accumulated_text}
```

Use `ai.askAi()` with this prompt. The AI service streams the response.

### Window Lifecycle

1. Window opens → immediately starts mic + Soniox
2. "End" clicked → stops recording, sends to AI
3. Result shown → "Copy & Close" copies to clipboard + destroys window
4. Window close (X or Escape) → cleanup, no translation

### Keyboard Shortcuts (window-level)

- `Escape` → cancel and close
- `Enter` → same as "End" button (finish recording)

## Edge Cases

- No Soniox API key → show error toast, close window
- No AI API key → show error, close after recording (text still visible)
- Empty transcription → show "No speech detected", auto-close
- Window closed mid-recording → cleanup audio + soniox

## Related Files

- `src/voice-input-app.tsx` (main logic)
- `src/lib/soniox-websocket-client.ts` (may need tweak for no-translation mode)
- `src/hooks/use-ai-service.ts` (reuse as-is)
- `src/hooks/use-audio-capture.ts` (reuse as-is)

## Todo

- [ ] Check/adjust SonioxWebSocketClient for transcription-only mode
- [ ] Implement recording flow in voice-input-app
- [ ] Implement "End" → AI translate flow
- [ ] Implement clipboard copy + window close
- [ ] Add Escape/Enter keyboard shortcuts
- [ ] Handle edge cases (no keys, empty text, etc.)

## Success Criteria

- `Cmd+L` opens overlay globally
- Mic audio transcribed live in overlay
- "End" sends text to AI, translation streams back
- "Copy & Close" puts translation in clipboard
- Clean window lifecycle with no resource leaks
