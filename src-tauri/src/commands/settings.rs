use crate::settings::{Settings, SettingsState};
use crate::tray::rebuild_tray_menu;
use tauri::{AppHandle, State};

#[tauri::command]
pub fn get_settings(state: State<'_, SettingsState>) -> Result<Settings, String> {
    let settings = state
        .0
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;
    Ok(settings.clone())
}

#[tauri::command]
pub fn save_settings(
    app: AppHandle,
    new_settings: Settings,
    state: State<'_, SettingsState>,
) -> Result<(), String> {
    let mut settings = state
        .0
        .lock()
        .map_err(|e| format!("Lock error: {}", e))?;

    new_settings.save()?;
    *settings = new_settings.clone();

    drop(settings);
    let _ = rebuild_tray_menu(&app, &new_settings);

    Ok(())
}
