---
phase: 4
title: "Stop Word Detection"
status: completed
priority: P2
effort: 1.5h
completed: 2026-03-30
---

# Phase 4: Stop Word Detection

## Context Links
- dtateks/stt: `stop-word.ts` (~90 LOC) — normalization + matching
- Current: `src/voice-input-app.tsx` — only manual stop (Enter key or button click)

## Overview

Add configurable stop-word detection to end voice recording hands-free. When the user says a configured phrase (e.g., "thank you", "done"), recording ends automatically and the pipeline continues to correction/insertion.

## Key Insights

- Normalization is critical: trim, lowercase, remove accents (Vietnamese diacritics)
- Check against final tokens only (not provisional) to avoid false positives
- Stop word should be stripped from the final transcript
- Simple string matching is sufficient — no regex/NLP needed

## Requirements

### Functional
- Detect configurable stop phrase in final transcript
- Normalize both stop word and transcript for comparison (lowercase, trim, strip accents)
- Strip stop word from output transcript
- Stop word configurable in settings (default: empty = disabled)

### Non-Functional
- Zero false positives on provisional text
- Negligible performance impact (string comparison per final token)

## Related Code Files

### Create
- `src/lib/stop-word-detection.ts` — normalization + detection logic

### Modify
- `src-tauri/src/settings.rs` — add `voice_stop_word` field
- `src/types/settings.ts` — add TS field
- `src/voice-input-app.tsx` — integrate detection into transcript accumulation

## Implementation Steps

1. Add `voice_stop_word: String` to Settings (default: `""`)

2. Create `stop-word-detection.ts`:
   ```typescript
   export function normalizeText(text: string): string {
     return text.trim().toLowerCase()
       .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
   }

   export function detectStopWord(
     transcript: string,
     stopWord: string
   ): { detected: boolean; cleanedTranscript: string } {
     if (!stopWord) return { detected: false, cleanedTranscript: transcript };

     const normalizedTranscript = normalizeText(transcript);
     const normalizedStop = normalizeText(stopWord);

     if (normalizedTranscript.endsWith(normalizedStop)) {
       const cleaned = transcript.slice(0, transcript.length - stopWord.length).trim();
       return { detected: true, cleanedTranscript: cleaned };
     }

     return { detected: false, cleanedTranscript: transcript };
   }
   ```

3. Integrate in `voice-input-app.tsx`:
   - After each final segment from Soniox, check accumulated transcript for stop word
   - If detected: dispatch `STOP_LISTENING` action to state machine
   - Use cleaned transcript (stop word removed) for correction/insertion

## Todo List

- [x] Add `voice_stop_word` to Settings (Rust + TS)
- [x] Create `stop-word-detection.ts` with normalize + detect
- [x] Integrate detection in voice input transcript accumulation
- [x] Test with Vietnamese stop words (diacritics handling)
- [x] Test that provisional text doesn't trigger false positives

## Success Criteria

- Saying "thank you" (when configured) ends recording automatically
- Stop word is removed from the final transcript
- Vietnamese phrases with diacritics work (e.g., "cam on" matches "cam on")
- No false positives from partial/provisional text
- Empty stop word setting disables the feature
