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
    menu::{Menu, MenuItem, PredefinedMenuItem, Submenu},
    tray::TrayIconBuilder,
    Emitter, Manager, ActivationPolicy,
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

    // Language menu
    let lang_auto = MenuItem::with_id(app, "lang-source-auto", "Source: Auto-detect", true, None::<&str>)?;
    let lang_en = MenuItem::with_id(app, "lang-source-en", "Source: English", true, None::<&str>)?;
    let lang_ja = MenuItem::with_id(app, "lang-source-ja", "Source: Japanese", true, None::<&str>)?;
    let lang_ko = MenuItem::with_id(app, "lang-source-ko", "Source: Korean", true, None::<&str>)?;
    let lang_zh = MenuItem::with_id(app, "lang-source-zh", "Source: Chinese", true, None::<&str>)?;
    let sep_l1 = PredefinedMenuItem::separator(app)?;
    let target_vi = MenuItem::with_id(app, "lang-target-vi", "Target: Vietnamese", true, None::<&str>)?;
    let target_en = MenuItem::with_id(app, "lang-target-en", "Target: English", true, None::<&str>)?;
    let target_ja = MenuItem::with_id(app, "lang-target-ja", "Target: Japanese", true, None::<&str>)?;
    let target_ko = MenuItem::with_id(app, "lang-target-ko", "Target: Korean", true, None::<&str>)?;
    let target_zh = MenuItem::with_id(app, "lang-target-zh", "Target: Chinese", true, None::<&str>)?;
    let language_submenu = Submenu::with_id_and_items(
        app,
        "language-menu",
        "Language",
        true,
        &[
            &lang_auto, &lang_en, &lang_ja, &lang_ko, &lang_zh,
            &sep_l1,
            &target_vi, &target_en, &target_ja, &target_ko, &target_zh,
        ],
    )?;

    // AI menu
    let ai_toggle = MenuItem::with_id(app, "ai-toggle", "Toggle AI Assistant", true, Some("CmdOrCtrl+Shift+A"))?;
    let sep_ai = PredefinedMenuItem::separator(app)?;
    let ai_haiku = MenuItem::with_id(app, "ai-model-haiku", "Model: Haiku 4.5 (Fast)", true, None::<&str>)?;
    let ai_sonnet = MenuItem::with_id(app, "ai-model-sonnet", "Model: Sonnet 4.6 (Balanced)", true, None::<&str>)?;
    let ai_opus = MenuItem::with_id(app, "ai-model-opus", "Model: Opus 4.6 (Best)", true, None::<&str>)?;
    let ai_submenu = Submenu::with_id_and_items(
        app,
        "ai-menu",
        "AI",
        true,
        &[&ai_toggle, &sep_ai, &ai_haiku, &ai_sonnet, &ai_opus],
    )?;

    Menu::with_items(app, &[&app_submenu, &audio_submenu, &language_submenu, &ai_submenu, &history_submenu])
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
            app.handle().set_activation_policy(ActivationPolicy::Regular)?;
            let menu = build_menu(app)?;
            app.set_menu(menu)?;

            let current_settings = app.state::<SettingsState>().0.lock().unwrap().clone();
            let tray_menu = tray::build_tray_menu(app.handle(), &current_settings)?;
            let _tray = TrayIconBuilder::with_id("main-tray")
                .icon(app.default_window_icon().cloned().unwrap())
                .menu(&tray_menu)
                .tooltip("Translator")
                .on_menu_event(|app, event| {
                    let id = event.id().as_ref().to_string();
                    tray::handle_tray_event(app, &id);
                    if let Some(win) = app.get_webview_window("main") {
                        let _ = win.emit("menu-event", id.as_str());
                    }
                })
                .on_tray_icon_event(|tray, event| {
                    if let tauri::tray::TrayIconEvent::Click { .. } = event {
                        if let Some(win) = tray.app_handle().get_webview_window("main") {
                            let _ = win.show();
                            let _ = win.set_focus();
                        }
                    }
                })
                .build(app)?;

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
