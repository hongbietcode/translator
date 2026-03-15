use crate::settings::{Settings, SettingsState};
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Manager, Wry};

const TRAY_ID: &str = "main-tray";

pub fn build_tray_menu(handle: &AppHandle, s: &Settings) -> tauri::Result<Menu<Wry>> {
    let start = MenuItem::with_id(handle, "start", "Start / Stop", true, None::<&str>)?;
    let sep1 = PredefinedMenuItem::separator(handle)?;

    let src_langs = [("auto", "Auto-detect"), ("en", "English"), ("ja", "Japanese"), ("ko", "Korean"), ("zh", "Chinese")];
    let src_items: Vec<CheckMenuItem<Wry>> = src_langs.iter().map(|(code, label)| {
        CheckMenuItem::with_id(handle, format!("lang-source-{}", code), *label, true, s.source_language == *code, None::<&str>).unwrap()
    }).collect();
    let src_refs: Vec<&dyn tauri::menu::IsMenuItem<Wry>> = src_items.iter().map(|i| i as &dyn tauri::menu::IsMenuItem<Wry>).collect();
    let source_sub = Submenu::with_id_and_items(handle, "tray-source", "Source Language", true, &src_refs)?;

    let tgt_langs = [("vi", "Vietnamese"), ("en", "English"), ("ja", "Japanese"), ("ko", "Korean"), ("zh", "Chinese")];
    let tgt_items: Vec<CheckMenuItem<Wry>> = tgt_langs.iter().map(|(code, label)| {
        CheckMenuItem::with_id(handle, format!("lang-target-{}", code), *label, true, s.target_language == *code, None::<&str>).unwrap()
    }).collect();
    let tgt_refs: Vec<&dyn tauri::menu::IsMenuItem<Wry>> = tgt_items.iter().map(|i| i as &dyn tauri::menu::IsMenuItem<Wry>).collect();
    let target_sub = Submenu::with_id_and_items(handle, "tray-target", "Target Language", true, &tgt_refs)?;

    let sep2 = PredefinedMenuItem::separator(handle)?;

    let inp_sys = CheckMenuItem::with_id(handle, "source-system", "System Audio", true, s.audio_source == "system", None::<&str>)?;
    let inp_mic = CheckMenuItem::with_id(handle, "source-mic", "Microphone", true, s.audio_source == "microphone", None::<&str>)?;
    let inp_both = CheckMenuItem::with_id(handle, "source-both", "Both", true, s.audio_source == "both", None::<&str>)?;
    let input_sub = Submenu::with_id_and_items(
        handle, "tray-input", "Audio Input", true,
        &[&inp_sys, &inp_mic, &inp_both],
    )?;

    let sep3 = PredefinedMenuItem::separator(handle)?;
    let ai_toggle = CheckMenuItem::with_id(handle, "ai-toggle", "AI Assistant", true, s.ai_enabled, None::<&str>)?;

    let sep4 = PredefinedMenuItem::separator(handle)?;
    let settings = MenuItem::with_id(handle, "settings", "Settings…", true, None::<&str>)?;
    let quit = PredefinedMenuItem::quit(handle, Some("Quit Translator"))?;

    Menu::with_items(handle, &[
        &start, &sep1,
        &source_sub, &target_sub, &sep2,
        &input_sub, &sep3,
        &ai_toggle, &sep4,
        &settings, &quit,
    ])
}

pub fn rebuild_tray_menu(handle: &AppHandle, s: &Settings) -> tauri::Result<()> {
    if let Some(tray) = handle.tray_by_id(TRAY_ID) {
        let menu = build_tray_menu(handle, s)?;
        tray.set_menu(Some(menu))?;
    }
    Ok(())
}

pub fn handle_tray_event(app: &AppHandle, id: &str) {
    let state = app.state::<SettingsState>();
    let mut settings = match state.0.lock() {
        Ok(s) => s,
        Err(_) => return,
    };

    let mut changed = false;

    if let Some(code) = id.strip_prefix("lang-source-") {
        settings.source_language = code.to_string();
        changed = true;
    } else if let Some(code) = id.strip_prefix("lang-target-") {
        settings.target_language = code.to_string();
        changed = true;
    } else if id == "source-system" {
        settings.audio_source = "system".to_string();
        changed = true;
    } else if id == "source-mic" {
        settings.audio_source = "microphone".to_string();
        changed = true;
    } else if id == "source-both" {
        settings.audio_source = "both".to_string();
        changed = true;
    } else if id == "ai-toggle" {
        settings.ai_enabled = !settings.ai_enabled;
        changed = true;
    }

    if changed {
        let _ = settings.save();
        let s = settings.clone();
        drop(settings);
        let _ = rebuild_tray_menu(app, &s);
    }
}
