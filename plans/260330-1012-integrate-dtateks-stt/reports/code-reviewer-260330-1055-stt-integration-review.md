# Code Review: dtateks/stt Features Integration

## Scope
- Files reviewed: 14 (5 new, 9 modified)
- LOC added: ~600 Rust, ~400 TypeScript
- Focus: Security, correctness, edge cases, async races

## Overall Assessment

Solid implementation. Architecture decisions are sound -- state machine, retry logic, transactional shortcut rollback. A few issues need attention, one critical.

---

## Critical Issues

### 1. [CRITICAL] AppleScript injection in `text_inserter.rs` (line 24-29)

The `set_clipboard` function escapes `\`, `"`, `\n`, `\r` but **misses single quotes and backslash-escaped AppleScript control characters**. More importantly, the escaping is incomplete for AppleScript string literals.

**Attack vector:** If LLM correction returns crafted text (or user dictates specific phrases), the osascript command could be manipulated. Example: text containing `\" & do shell script \"rm -rf /` would break out of the string context.

**Current escaping:**
```rust
let escaped = text
    .replace('\\', "\\\\")
    .replace('"', "\\\"")
    .replace('\n', "\\n")
    .replace('\r', "");
```

**Fix:** Use `std::process::Command` with stdin piping instead of string interpolation, or use `pbcopy` directly:
```rust
fn set_clipboard(text: &str) -> Result<(), String> {
    let mut child = Command::new("pbcopy")
        .stdin(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to run pbcopy: {}", e))?;
    child.stdin.take().unwrap()
        .write_all(text.as_bytes())
        .map_err(|e| format!("Failed to write to pbcopy: {}", e))?;
    child.wait().map_err(|e| format!("pbcopy failed: {}", e))?;
    Ok(())
}
```

This eliminates the injection surface entirely. `pbcopy` accepts raw stdin with no escaping needed.

---

## High Priority

### 2. [MAJOR] Stop word detection length mismatch (`stop-word-detection.ts`, line 19)

After NFD normalization + diacritic stripping, the normalized transcript length may differ from the original transcript length. But the cleaning uses `stopWord.length` (original, not normalized) to calculate the slice index:

```ts
const endIndex = transcript.length - stopWord.length;
const cleaned = transcript.slice(0, endIndex).trim();
```

**Example failure:** Stop word = "camon" (Vietnamese "cam on" with diacritics stripped). Original transcript ends with "cam on" (6 chars). `stopWord.length` = 5. Off by one -- cleaned transcript retains trailing character.

**Fix:** Match on normalized text but find the boundary in the original text by working backwards from the end, or use the normalized length:
```ts
const endIndex = transcript.length - stopWord.length;
```
Should be:
```ts
// Find actual position by scanning backwards in original
const normalizedLen = normalizedStop.length;
const normalizedEnd = normalizedTranscript.length;
const startOfMatch = normalizedEnd - normalizedLen;
// Map back: count original chars that produce `startOfMatch` normalized chars
let origIdx = 0;
let normIdx = 0;
const normTranscript = transcript.normalize("NFD");
while (normIdx < startOfMatch && origIdx < transcript.length) {
  const cp = normTranscript.codePointAt(normIdx)!;
  if (cp < 0x0300 || cp > 0x036f) origIdx++;
  normIdx++;
}
const cleaned = transcript.slice(0, origIdx).trim();
```

**Simpler alternative:** normalize the transcript first, do the slice on the normalized version, accept that diacritics are stripped from the cleaned output. Since LLM correction follows, this may be acceptable.

### 3. [MAJOR] Race condition in `voice-input-app.tsx` -- stale closure in `handleEnd`

`handleEnd` is defined with `useCallback` depending on `[stopCapture, soniox, settings, sm]`, but `accumulatedRef.current` is read from a ref (good). However, `handleEnd` is called from the `useEffect` that watches `soniox.segments` (line 42), which captures an old `handleEnd` because the effect dependency array does not include `handleEnd`:

```ts
useEffect(() => {
  // ...
  if (detected) {
    handleEnd(cleanedTranscript); // potentially stale closure
  }
}, [soniox.segments, soniox.provisionalText]);
```

**Impact:** If settings change between renders (unlikely during voice input but possible), the stale closure would use old settings for LLM correction config.

**Fix:** Add `handleEnd` to the dependency array, or use a ref for `handleEnd`:
```ts
const handleEndRef = useRef(handleEnd);
handleEndRef.current = handleEnd;
// In effect: handleEndRef.current(cleanedTranscript);
```

### 4. [MAJOR] `global_shortcut.rs` -- Mutex poisoning panic (line 17, 38)

Two separate `.lock().unwrap()` calls on the same mutex. If the first lock's scope overlaps with an error path, the mutex could be poisoned. More importantly, if another thread panics while holding the lock, subsequent `unwrap()` calls will cascade-panic.

**Fix:** Use `lock().map_err(|e| format!("Settings lock poisoned: {}", e))?` instead of `unwrap()`.

---

## Medium Priority

### 5. [MEDIUM] Settings sync mismatch: `max_lines` in Rust, missing in TypeScript

`settings.rs` still has `max_lines: u32` (line 29) but `settings.ts` does not include it. This causes:
- Deserialization works (serde default), but round-tripping settings from frontend will drop `max_lines` from the JSON
- Existing `settings.json` files with `max_lines` will lose the value on next save

**Fix:** Either add `max_lines` back to TS interface or remove it from Rust struct. Based on commit `124cef1` ("remove max lines setting"), it should be removed from Rust too.

### 6. [MEDIUM] LLM correction fails silently -- no user feedback (`llm_correction.rs`, line 129)

When all retries fail, the function returns `Ok(text)` (original text). This is a good graceful degradation, but the `eprintln!` on line 129 only goes to stderr. The frontend has no indication that correction was attempted and failed.

**Suggestion:** Return a structured result with a `corrected: bool` flag, or log to a Tauri event so the UI can show a subtle indicator.

### 7. [MEDIUM] `voice-input-app.tsx` -- cleanup not guaranteed on unmount

The `startCapture` call (line 70) happens inside an effect that does not return a cleanup function. If the component unmounts before `handleEnd` is called, audio capture and Soniox connection remain open.

**Fix:** Add cleanup to the startup effect:
```ts
return () => {
  stopCapture().catch(() => {});
  soniox.disconnect();
};
```

### 8. [MEDIUM] HTTP client created per-request in `llm_correction.rs` (line 116)

A new `reqwest::Client` is built on every `correct_transcript` invocation. This prevents connection pooling and TLS session reuse.

**Fix:** Accept a Tauri managed state with a pre-built client, or use `once_cell::Lazy<Client>`.

---

## Minor Issues

### 9. [MINOR] `check_accessibility_permission` is an unreliable proxy

The osascript `exists process 1` check (line 94-97) tests whether System Events can enumerate processes, not whether the app has accessibility permission (AXIsProcessTrusted). It may return `true` even without accessibility granted.

**Better approach:** Use the `accessibility` crate or call `AXIsProcessTrusted()` via FFI.

### 10. [MINOR] `text_inserter.rs` -- blocking `Command::new` on async context

`run_osascript` uses `std::process::Command` (synchronous) inside an `async fn`. This blocks the Tokio runtime thread. The sleeps use `tokio::time::sleep` correctly, but the command execution itself blocks.

**Fix:** Use `tokio::process::Command` instead, or wrap in `spawn_blocking`.

### 11. [MINOR] State machine allows some transitions from any state

`TRANSCRIPT_READY`, `START_CORRECTING`, `START_INSERTING` actions transition regardless of current phase. Could lead to unexpected state if dispatched out of order.

**Suggestion:** Guard these transitions:
```ts
case "START_CORRECTING":
  if (state.phase !== "finalizing") return state;
  return { phase: "correcting", transcript: action.transcript };
```

### 12. [MINOR] Shortcut recording in settings -- no modifier required validation

`handleShortcutKeyDown` (line 148) requires `parts.length >= 2`, but a user could set `Shift+A` which would type "A" in text fields. Consider requiring at least one of Cmd/Ctrl/Alt.

---

## Positive Observations

- Transactional rollback in `global_shortcut.rs` -- good UX pattern, reverts to old shortcut on failure
- Graceful degradation in LLM correction -- returns original text on failure instead of blocking
- Clipboard restore in `text_inserter.rs` -- respects user's clipboard state
- Exponential backoff in retry logic with transient error classification
- State machine is clean, exhaustive, and type-safe with discriminated unions
- Stop word normalization handles diacritics (NFD + strip) -- good for Vietnamese
- Fallback to `navigator.clipboard.writeText` when `insert_text_at_cursor` fails

---

## Recommended Actions (Priority Order)

1. **Fix AppleScript injection** -- switch to `pbcopy` stdin approach (Critical)
2. **Fix stop word length mismatch** -- use normalized length for slicing (Major)
3. **Fix stale closure** in stop word effect -- use handleEnd ref (Major)
4. **Replace `.unwrap()` on mutex locks** with proper error propagation (Major)
5. **Sync `max_lines` removal** between Rust and TS (Medium)
6. **Add cleanup to startup effect** in voice-input-app (Medium)
7. **Use `tokio::process::Command`** or `spawn_blocking` for osascript calls (Minor)
8. **Pool the reqwest Client** via Tauri state (Medium)

---

## Unresolved Questions

1. Is the app intended for personal use only? If so, the AppleScript injection risk is lower priority (attacker would need to control LLM response). Still recommend fixing.
2. Should LLM correction failure be surfaced to the user, or is silent fallback to original text the desired UX?
3. The `voice_endpoint_delay_ms` setting range (500-3000ms in UI) -- has this been validated against Soniox's accepted range?
