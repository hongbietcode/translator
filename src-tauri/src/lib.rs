mod audio;
mod commands;
mod settings;

use audio::microphone::MicCapture;
use audio::system_audio::SystemAudioCapture;
use commands::audio::AudioState;
use settings::{Settings, SettingsState};
use std::sync::Mutex;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    Emitter, Manager,
};

fn build_menu(app: &tauri::App) -> tauri::Result<Menu<tauri::Wry>> {
    // App menu
    let start_item = MenuItem::with_id(
        app,
        "start",
        "Start Live Translate",
        true,
        Some("CmdOrCtrl+Return"),
    )?;
    let sep_a1 = PredefinedMenuItem::separator(app)?;
    let settings_item = MenuItem::with_id(
        app,
        "settings",
        "Preferences…",
        true,
        Some("CmdOrCtrl+Comma"),
    )?;
    let sep_a2 = PredefinedMenuItem::separator(app)?;
    let quit_item = PredefinedMenuItem::quit(app, None)?;
    let app_submenu = Submenu::with_id_and_items(
        app,
        "app-menu",
        "Translator",
        true,
        &[&start_item, &sep_a1, &settings_item, &sep_a2, &quit_item],
    )?;

    // Audio Source menu
    let source_system = MenuItem::with_id(
        app,
        "source-system",
        "System Audio",
        true,
        Some("CmdOrCtrl+1"),
    )?;
    let source_mic = MenuItem::with_id(app, "source-mic", "Microphone", true, Some("CmdOrCtrl+2"))?;
    let source_both = MenuItem::with_id(app, "source-both", "Both", true, Some("CmdOrCtrl+3"))?;
    let audio_submenu = Submenu::with_id_and_items(
        app,
        "audio-menu",
        "Audio Source",
        true,
        &[&source_system, &source_mic, &source_both],
    )?;

    // History menu
    let history_item = MenuItem::with_id(
        app,
        "view-history",
        "View History",
        true,
        Some("CmdOrCtrl+H"),
    )?;
    let sep_h = PredefinedMenuItem::separator(app)?;
    let export_item = MenuItem::with_id(app, "export", "Export Transcript…", true, None::<&str>)?;
    let clear_item = MenuItem::with_id(app, "clear-history", "Clear History", true, None::<&str>)?;
    let history_submenu = Submenu::with_id_and_items(
        app,
        "history-menu",
        "History",
        true,
        &[&history_item, &sep_h, &export_item, &clear_item],
    )?;

    Menu::with_items(app, &[&app_submenu, &audio_submenu, &history_submenu])
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_settings = Settings::load();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(SettingsState(Mutex::new(initial_settings)))
        .manage(AudioState {
            system_audio: Mutex::new(SystemAudioCapture::new()),
            microphone: Mutex::new(MicCapture::new()),
            active_receiver: Mutex::new(None),
        })
        .setup(|app| {
            let menu = build_menu(app)?;
            app.set_menu(menu)?;
            Ok(())
        })
        .on_menu_event(|app, event| {
            if let Some(win) = app.get_webview_window("main") {
                let _ = win.emit("menu-event", event.id().as_ref());
            }
        })
        .invoke_handler(tauri::generate_handler![
            commands::settings::get_settings,
            commands::settings::save_settings,
            commands::audio::start_capture,
            commands::audio::stop_capture,
            commands::audio::check_permissions,
            commands::audio::list_input_devices,
            commands::transcript::append_transcript,
            commands::transcript::get_transcript_path,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
