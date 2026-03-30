use crate::settings::SettingsState;
use crate::tray;
use tauri::{AppHandle, Manager};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

/// Update the voice input global shortcut with transactional rollback
#[tauri::command]
pub fn update_voice_input_shortcut(
    app: AppHandle,
    new_shortcut: String,
) -> Result<(), String> {
    let new_parsed: Shortcut = new_shortcut
        .parse()
        .map_err(|_| format!("Invalid shortcut: {}", new_shortcut))?;

    let state = app.state::<SettingsState>();
    let old_shortcut_str = state
        .0
        .lock()
        .map_err(|e| format!("Failed to lock settings: {}", e))?
        .voice_input_shortcut
        .clone();

    if let Ok(old_parsed) = old_shortcut_str.parse::<Shortcut>() {
        let _ = app.global_shortcut().unregister(old_parsed);
    }

    if let Err(e) = app.global_shortcut().on_shortcut(new_parsed, |app, _shortcut, event| {
        if event.state == ShortcutState::Pressed {
            let _ = tray::open_voice_input_window(app);
        }
    }) {
        if let Ok(old_parsed) = old_shortcut_str.parse::<Shortcut>() {
            let _ = app.global_shortcut().on_shortcut(old_parsed, |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    let _ = tray::open_voice_input_window(app);
                }
            });
        }
        return Err(format!("Failed to register shortcut: {}", e));
    }

    let mut settings = state
        .0
        .lock()
        .map_err(|e| format!("Failed to lock settings: {}", e))?;
    settings.voice_input_shortcut = new_shortcut;
    settings.save()?;

    Ok(())
}
