mod audio;
mod commands;
mod settings;
pub mod tray;

use audio::microphone::MicCapture;
use audio::system_audio::SystemAudioCapture;
use commands::audio::AudioState;
use settings::{Settings, SettingsState};
use std::sync::Mutex;
use tauri::{
    tray::TrayIconBuilder,
    Manager, ActivationPolicy,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

#[tauri::command]
fn set_translating(app: tauri::AppHandle, active: bool) {
    tray::set_translating(&app, active);
}

#[tauri::command]
fn is_translating() -> bool {
    tray::is_translating()
}

#[tauri::command]
fn toggle_subtitle_window(app: tauri::AppHandle, show: bool) {
    if show {
        let _ = tray::open_subtitle_window(&app);
    } else {
        tray::close_subtitle_window(&app);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_settings = Settings::load();

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .manage(SettingsState(Mutex::new(initial_settings)))
        .manage(AudioState {
            system_audio: Mutex::new(SystemAudioCapture::new()),
            microphone: Mutex::new(MicCapture::new()),
            active_receiver: Mutex::new(None),
        })
        .setup(|app| {
            app.handle().set_activation_policy(ActivationPolicy::Accessory)?;

            let current_settings = app.state::<SettingsState>().0.lock().unwrap().clone();
            let tray_menu = tray::build_tray_menu(app.handle(), &current_settings)?;
            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().cloned().unwrap())
                .menu(&tray_menu)
                .tooltip("Translator")
                .on_menu_event(|app, event| {
                    let id = event.id().as_ref().to_string();
                    tray::handle_tray_event(app, &id);
                })
                .build(app)?;

            let shortcut_str = &current_settings.voice_input_shortcut;
            let shortcut: Shortcut = shortcut_str
                .parse()
                .unwrap_or_else(|_| "CmdOrCtrl+L".parse().unwrap());
            app.global_shortcut().on_shortcut(shortcut, |app, _shortcut, event| {
                if event.state == ShortcutState::Pressed {
                    let _ = tray::open_voice_input_window(app);
                }
            })?;

            Ok(())
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
            set_translating,
            is_translating,
            toggle_subtitle_window,
            commands::translate::translate_text,
            commands::text_inserter::insert_text_at_cursor,
            commands::text_inserter::check_accessibility_permission,
            commands::llm_correction::correct_transcript,
            commands::global_shortcut::update_voice_input_shortcut,
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
            }
        });
}
