---
phase: 2
title: "LLM Correction Service"
status: completed
priority: P2
effort: 2h
completed: 2026-03-30
---

# Phase 2: LLM Correction Service

## Context Links
- [Research report](/plans/reports/researcher-260330-1012-dtateks-stt-analysis.md) — LLM pipeline details
- Current translate command: `src-tauri/src/commands/translate.rs` — Anthropic-only, translation purpose

## Overview

Add an optional LLM-based transcript correction step. Uses OpenAI-compatible API format (covers OpenAI, xAI/Grok, Gemini via proxy, local Ollama). Runs between STT finalization and text insertion.

## Key Insights

- dtateks/stt supports 3 providers separately — YAGNI, OpenAI-compatible format covers all
- Retry logic essential for transient errors (408, 429, 500-504)
- Temperature 0.1 works well for correction (consistency over creativity)
- Fallback to original text if LLM fails — never block insertion

## Requirements

### Functional
- Correct grammar/spelling of STT transcript via LLM
- Support any OpenAI-compatible API endpoint (configurable base URL)
- Retry on transient failures (3 attempts, exponential backoff)
- Fallback to original transcript on failure
- Configurable: enable/disable, model, API key, base URL

### Non-Functional
- Latency: <2s for typical sentence correction
- Reliability: Never block text insertion due to LLM failure

## Architecture

```
Final transcript from Soniox
    │
    ▼
llm_correction.rs::correct_transcript()
    ├── Build prompt: "Fix spelling and grammar, preserve meaning: <text>"
    ├── POST to {base_url}/chat/completions
    ├── Parse response.choices[0].message.content
    ├── On error: retry up to 3x with backoff
    └── On total failure: return original text
```

## Related Code Files

### Create
- `src-tauri/src/commands/llm_correction.rs` — LLM correction service + Tauri command

### Modify
- `src-tauri/src/commands/mod.rs` — register module
- `src-tauri/src/lib.rs` — register command
- `src-tauri/src/settings.rs` — add LLM correction settings fields
- `src/types/settings.ts` — add corresponding TS fields

## Implementation Steps

1. Add settings fields to `Settings` struct:
   ```rust
   pub llm_correction_enabled: bool,      // default: false
   pub llm_correction_api_key: String,     // default: ""
   pub llm_correction_base_url: String,    // default: "https://api.openai.com/v1"
   pub llm_correction_model: String,       // default: "gpt-4o-mini"
   pub llm_correction_language: String,    // default: "auto" (or "en", "vi")
   ```

2. Mirror in `settings.ts` TypeScript types + defaults

3. Create `llm_correction.rs`:
   - `correct_transcript(text, api_key, base_url, model, language) -> Result<String, String>`
   - Build system prompt based on language: "Fix spelling/grammar. Output corrected text only."
   - POST to `{base_url}/chat/completions` with temperature 0.1
   - Parse OpenAI-format response
   - Retry logic: check status code, retry on transient errors

4. Create Tauri command:
   ```rust
   #[tauri::command]
   pub async fn correct_transcript(
       text: String,
       api_key: String,
       base_url: String,
       model: String,
       language: String,
   ) -> Result<String, String>
   ```

5. Register in `lib.rs`

## Todo List

- [x] Add LLM correction settings fields (Rust + TS)
- [x] Create `llm_correction.rs` with OpenAI-compatible client
- [x] Implement retry logic with exponential backoff
- [x] Add Tauri command for transcript correction
- [x] Register command in `lib.rs`
- [x] Test with OpenAI API and local Ollama

## Success Criteria

- Corrects obvious STT errors (e.g., "their" → "there" in context)
- Falls back to original text if API unreachable
- Works with OpenAI, xAI (api.x.ai), and Ollama (localhost:11434)
- Retry handles 429 rate limits gracefully
- Adds <2s latency for typical sentences

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| LLM changes meaning | User gets wrong text | Low temperature (0.1), focused prompt |
| High latency | Slow insertion UX | Show "Correcting..." state, timeout at 5s |
| API costs | Unexpected bills | Off by default, user must opt-in and provide key |
