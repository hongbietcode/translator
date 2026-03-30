---
phase: 1
title: "Text Insertion Backend"
status: completed
priority: P1
effort: 3h
completed: 2026-03-30
---

# Phase 1: Text Insertion Backend

## Context Links
- [dtateks/stt text_inserter.rs](https://github.com/dtateks/stt) — reference implementation (~650 LOC)
- [Research report](/plans/reports/researcher-260330-1012-dtateks-stt-analysis.md)
- Current voice input: `src/voice-input-app.tsx` — only copies to clipboard, no insertion

## Overview

Add a Rust module that inserts text at the cursor position in the currently focused application. Uses AppleScript via `std::process::Command` to simulate Cmd+V paste, with clipboard preservation.

## Key Insights

- dtateks/stt uses AppleScript `System Events` for keystroke simulation — proven reliable on macOS
- Clipboard must be saved/restored to avoid overwriting user's clipboard
- Long texts need longer delays (700ms for >200 chars) for reliable paste
- Retry mechanism (2 attempts) handles System Events timing issues
- Accessibility permission is required — need to check and prompt

## Requirements

### Functional
- Insert arbitrary text at cursor position in any focused app
- Preserve clipboard state (save before, restore after)
- Support Enter mode (auto-press Enter after insertion)
- Handle long text with appropriate delays

### Non-Functional
- Latency: <500ms for short text insertion
- Reliability: Retry on System Events failure
- Permission: Check accessibility permission and report status

## Architecture

```
Tauri Command: insert_text_at_cursor
    │
    ▼
text_inserter.rs
    ├── save_clipboard()     → NSPasteboard snapshot via osascript
    ├── set_clipboard(text)  → osascript to set clipboard
    ├── paste_keystroke()    → osascript System Events Cmd+V
    ├── press_enter()        → osascript System Events Return key
    └── restore_clipboard()  → NSPasteboard restore
```

## Related Code Files

### Create
- `src-tauri/src/commands/text_inserter.rs` — text insertion logic + Tauri commands

### Modify
- `src-tauri/src/commands/mod.rs` — register new module
- `src-tauri/src/lib.rs` — register new Tauri commands

## Implementation Steps

1. Create `text_inserter.rs` with these functions:
   - `save_clipboard() -> Result<String, String>` — run `osascript -e 'the clipboard as text'` to capture current clipboard
   - `set_clipboard(text: &str) -> Result<(), String>` — run `osascript -e 'set the clipboard to "..."'` with proper escaping
   - `simulate_paste() -> Result<(), String>` — run AppleScript: `tell application "System Events" to keystroke "v" using command down`
   - `simulate_enter() -> Result<(), String>` — run AppleScript: `tell application "System Events" to keystroke return`
   - `restore_clipboard(original: &str) -> Result<(), String>` — restore saved clipboard content

2. Create main Tauri command:
   ```rust
   #[tauri::command]
   pub async fn insert_text_at_cursor(text: String, press_enter: bool) -> Result<(), String> {
       let original_clipboard = save_clipboard().unwrap_or_default();
       set_clipboard(&text)?;

       let delay = if text.len() > 200 { 700 } else { 200 };
       tokio::time::sleep(Duration::from_millis(delay)).await;

       simulate_paste()?;

       if press_enter {
           tokio::time::sleep(Duration::from_millis(100)).await;
           simulate_enter()?;
       }

       tokio::time::sleep(Duration::from_millis(200)).await;
       restore_clipboard(&original_clipboard).ok();

       Ok(())
   }
   ```

3. Add `check_accessibility_permission() -> bool` command using osascript to check AXIsProcessTrusted

4. Register commands in `lib.rs`

## Todo List

- [x] Create `text_inserter.rs` with clipboard save/restore
- [x] Implement paste simulation via AppleScript
- [x] Implement Enter key simulation
- [x] Add retry logic (2 attempts, 75ms between)
- [x] Add `check_accessibility_permission` command
- [x] Register commands in `lib.rs`
- [x] Test with various apps (Terminal, browser, text editor)

## Success Criteria

- Text appears at cursor in focused app after command invocation
- Clipboard is preserved (original content restored after insertion)
- Enter mode works when enabled
- Graceful error when accessibility permission not granted
- Works in Terminal, browser input fields, text editors

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Accessibility permission not granted | Insertion fails silently | Check permission upfront, show UI prompt |
| AppleScript timing issues | Paste fails intermittently | Retry mechanism with delays |
| Clipboard contains non-text (images) | Restore may fail | Save as text only; accept data loss for non-text clipboard |
| Sandboxed apps reject System Events | No insertion | Document known limitations |

## Security Considerations

- Accessibility permission required — users must explicitly grant in System Settings
- Clipboard content temporarily overwritten — restored after insertion
- No sensitive data logged during insertion process
