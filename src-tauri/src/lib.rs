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

#[tauri::command]
fn set_translating(app: tauri::AppHandle, active: bool) {
    tray::set_translating(&app, active);
}

#[tauri::command]
fn is_translating() -> bool {
    tray::is_translating()
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
        ])
        .build(tauri::generate_context!())
        .expect("error while building tauri application")
        .run(|_app, event| {
            if let tauri::RunEvent::ExitRequested { api, .. } = event {
                api.prevent_exit();
            }
        });
}
