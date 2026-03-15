# Phase 1: Global Shortcut + Tray Item

**Priority:** High | **Status:** Pending

## Overview

Add `tauri-plugin-global-shortcut` for `Cmd+L` and a "Voice Input" tray menu item to trigger the voice input overlay.

## Requirements

- `Cmd+L` works globally (even when app not focused)
- Tray menu gets new "Voice Input" item with `CmdOrCtrl+L` shortcut hint
- Both trigger opening the voice-input window

## Architecture

### Rust Changes

**1. Add global-shortcut plugin**

`Cargo.toml`:
```toml
tauri-plugin-global-shortcut = "2"
```

`src-tauri/capabilities/default.json` — add:
```json
"global-shortcut:allow-register",
"global-shortcut:allow-unregister"
```

`src-tauri/src/lib.rs` — register plugin + shortcut:
```rust
.plugin(tauri_plugin_global_shortcut::Builder::new().build())
```

Register `Cmd+L` in setup to call `open_voice_input_window()`.

**2. Tray menu item (`tray.rs`)**

Add `MenuItem` with id `"voice-input"`, label `"🎤 Voice Input"`, shortcut `CmdOrCtrl+L`.
Insert between `ai-toggle` and `sep4`.

Handle `"voice-input"` in `handle_tray_event` → call `open_voice_input_window()`.

**3. New window opener (`tray.rs`)**

```rust
pub fn open_voice_input_window(handle: &AppHandle) -> tauri::Result<()> {
    if let Some(win) = handle.get_webview_window("voice-input") {
        let _ = win.show();
        let _ = win.set_focus();
        return Ok(());
    }
    WebviewWindowBuilder::new(handle, "voice-input", WebviewUrl::App("voice-input.html".into()))
        .title("Voice Input")
        .inner_size(400.0, 200.0)
        .decorations(false)
        .always_on_top(true)
        .resizable(false)
        .center()
        .build()?;
    Ok(())
}
```

## Related Files

- `src-tauri/Cargo.toml`
- `src-tauri/src/lib.rs`
- `src-tauri/src/tray.rs`
- `src-tauri/capabilities/default.json`

## Todo

- [ ] Add `tauri-plugin-global-shortcut` dependency
- [ ] Register plugin in lib.rs
- [ ] Register `Cmd+L` global shortcut in setup
- [ ] Add tray menu item "Voice Input"
- [ ] Add `open_voice_input_window` function
- [ ] Handle `"voice-input"` in tray event handler
- [ ] Add capabilities for global-shortcut
