---
phase: 5
title: "Customizable Global Hotkey"
status: completed
priority: P2
effort: 2h
completed: 2026-03-30
---

# Phase 5: Customizable Global Hotkey

## Context Links
- Current: `src-tauri/src/lib.rs` line 66 — hardcoded `"CmdOrCtrl+L"`
- dtateks/stt: `lib.rs` — dynamic registration with rollback on failure

## Overview

Let users change the voice input global shortcut from settings. Implement transactional shortcut update: unregister old -> register new -> rollback if new fails.

## Key Insights

- `tauri-plugin-global-shortcut` already in use, supports runtime registration/unregistration
- Must validate shortcut string before attempting registration
- Rollback pattern: if new shortcut fails, re-register the old one
- Persist chosen shortcut in settings for app restart

## Requirements

### Functional
- User can set custom global shortcut in settings
- Shortcut validated before registration attempt
- Transactional: old shortcut unregistered, new registered, rollback on failure
- Shortcut persisted across app restarts
- Default: `CmdOrCtrl+L`

### Non-Functional
- No shortcut conflict with system shortcuts (user responsibility)
- Fast registration (<100ms)

## Related Code Files

### Modify
- `src-tauri/src/lib.rs` — make shortcut registration dynamic
- `src-tauri/src/settings.rs` — add `voice_input_shortcut` field
- `src/types/settings.ts` — add TS field

### Create
- `src-tauri/src/commands/global_shortcut.rs` — Tauri command for shortcut update

## Implementation Steps

1. Add `voice_input_shortcut: String` to Settings (default: `"CmdOrCtrl+L"`)

2. Refactor `lib.rs` setup:
   - Read shortcut from settings instead of hardcoding
   - Parse shortcut string to `Shortcut` type
   - Register with same handler (open voice input window)

3. Create `global_shortcut.rs` with Tauri command:
   ```rust
   #[tauri::command]
   pub fn update_voice_input_shortcut(
       app: AppHandle,
       new_shortcut: String,
   ) -> Result<(), String> {
       let new_parsed: Shortcut = new_shortcut.parse()
           .map_err(|_| format!("Invalid shortcut: {}", new_shortcut))?;

       let state = app.state::<SettingsState>();
       let old_shortcut_str = state.0.lock().unwrap().voice_input_shortcut.clone();
       let old_parsed: Shortcut = old_shortcut_str.parse().unwrap();

       // Unregister old
       app.global_shortcut().unregister(old_parsed)
           .map_err(|e| format!("Failed to unregister old shortcut: {}", e))?;

       // Register new
       if let Err(e) = app.global_shortcut().on_shortcut(new_parsed, |app, _, event| {
           if event.state == ShortcutState::Pressed {
               let _ = tray::open_voice_input_window(app);
           }
       }) {
           // Rollback: re-register old
           let _ = app.global_shortcut().on_shortcut(old_parsed, |app, _, event| {
               if event.state == ShortcutState::Pressed {
                   let _ = tray::open_voice_input_window(app);
               }
           });
           return Err(format!("Failed to register new shortcut: {}", e));
       }

       // Persist
       let mut settings = state.0.lock().unwrap();
       settings.voice_input_shortcut = new_shortcut;
       settings.save()?;

       Ok(())
   }
   ```

4. Register command in `lib.rs`

5. Add shortcut input in settings UI (Phase 6 handles the UI part)

## Todo List

- [x] Add `voice_input_shortcut` to Settings (Rust + TS)
- [x] Refactor `lib.rs` to read shortcut from settings
- [x] Create `global_shortcut.rs` with transactional update command
- [x] Register command in `lib.rs`
- [x] Handle app startup with persisted shortcut
- [x] Test shortcut change and rollback on failure

## Success Criteria

- User can change shortcut in settings, new shortcut works immediately
- Invalid shortcut strings rejected with clear error
- If new shortcut registration fails, old shortcut continues working
- Shortcut persists across app restarts
- Tray menu shows current shortcut label

## Risk Assessment

| Risk | Impact | Mitigation |
|------|--------|------------|
| Shortcut conflicts with OS | Shortcut doesn't fire | User's responsibility; show warning |
| Registration fails silently | No voice input | Rollback to previous shortcut |
| Invalid shortcut string crashes | App unusable | Validate string before parse attempt |
