use crate::settings::{Settings, SettingsState};
use std::sync::atomic::{AtomicBool, Ordering};
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem, Submenu};
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder, Wry};

const TRAY_ID: &str = "main-tray";
static IS_TRANSLATING: AtomicBool = AtomicBool::new(false);

pub fn build_tray_menu(handle: &AppHandle, s: &Settings) -> tauri::Result<Menu<Wry>> {
    let translating = IS_TRANSLATING.load(Ordering::Relaxed);
    let start_label = if translating {
        "■ Stop Live Translate"
    } else {
        "▶ Start Live Translate"
    };
    let start = MenuItem::with_id(handle, "start", start_label, true, Some("CmdOrCtrl+Return"))?;
    let sep1 = PredefinedMenuItem::separator(handle)?;

    let src_langs = [
        ("auto", "Auto-detect"),
        ("en", "English"),
        ("ja", "Japanese"),
        ("ko", "Korean"),
        ("zh", "Chinese"),
    ];
    let src_items: Vec<CheckMenuItem<Wry>> = src_langs
        .iter()
        .map(|(code, label)| {
            CheckMenuItem::with_id(
                handle,
                format!("lang-source-{}", code),
                *label,
                true,
                s.source_language == *code,
                None::<&str>,
            )
            .unwrap()
        })
        .collect();
    let src_refs: Vec<&dyn tauri::menu::IsMenuItem<Wry>> = src_items
        .iter()
        .map(|i| i as &dyn tauri::menu::IsMenuItem<Wry>)
        .collect();
    let source_sub =
        Submenu::with_id_and_items(handle, "tray-source", "Source Language", true, &src_refs)?;

    let tgt_langs = [
        ("vi", "Vietnamese"),
        ("en", "English"),
        ("ja", "Japanese"),
        ("ko", "Korean"),
        ("zh", "Chinese"),
    ];
    let tgt_items: Vec<CheckMenuItem<Wry>> = tgt_langs
        .iter()
        .map(|(code, label)| {
            CheckMenuItem::with_id(
                handle,
                format!("lang-target-{}", code),
                *label,
                true,
                s.target_language == *code,
                None::<&str>,
            )
            .unwrap()
        })
        .collect();
    let tgt_refs: Vec<&dyn tauri::menu::IsMenuItem<Wry>> = tgt_items
        .iter()
        .map(|i| i as &dyn tauri::menu::IsMenuItem<Wry>)
        .collect();
    let target_sub =
        Submenu::with_id_and_items(handle, "tray-target", "Target Language", true, &tgt_refs)?;

    let sep2 = PredefinedMenuItem::separator(handle)?;

    let inp_sys = CheckMenuItem::with_id(
        handle,
        "source-system",
        "System Audio",
        true,
        s.audio_source == "system",
        None::<&str>,
    )?;
    let inp_mic = CheckMenuItem::with_id(
        handle,
        "source-mic",
        "Microphone",
        true,
        s.audio_source == "microphone",
        None::<&str>,
    )?;
    let inp_both = CheckMenuItem::with_id(
        handle,
        "source-both",
        "Both",
        true,
        s.audio_source == "both",
        None::<&str>,
    )?;
    let input_sub = Submenu::with_id_and_items(
        handle,
        "tray-input",
        "Audio Input",
        true,
        &[&inp_sys, &inp_mic, &inp_both],
    )?;

    let sep3 = PredefinedMenuItem::separator(handle)?;

    let shortcut_label = if s.voice_input_shortcut.is_empty() {
        "CmdOrCtrl+L".to_string()
    } else {
        s.voice_input_shortcut.clone()
    };
    let voice_input = MenuItem::with_id(
        handle,
        "voice-input",
        "Voice Input",
        true,
        Some(shortcut_label.as_str()),
    )?;

    let subtitle_toggle = CheckMenuItem::with_id(
        handle,
        "subtitle-toggle",
        "Subtitle Overlay",
        true,
        s.subtitle_mode,
        None::<&str>,
    )?;

    let sep4 = PredefinedMenuItem::separator(handle)?;
    let settings = MenuItem::with_id(
        handle,
        "settings",
        "Settings…",
        true,
        Some("CmdOrCtrl+Comma"),
    )?;
    let history = MenuItem::with_id(
        handle,
        "view-history",
        "View History",
        true,
        Some("CmdOrCtrl+H"),
    )?;

    let sep5 = PredefinedMenuItem::separator(handle)?;
    let quit = PredefinedMenuItem::quit(handle, Some("Quit Translator"))?;

    Menu::with_items(
        handle,
        &[
            &start,
            &sep1,
            &source_sub,
            &target_sub,
            &sep2,
            &input_sub,
            &sep3,
            &voice_input,
            &subtitle_toggle,
            &sep4,
            &settings,
            &history,
            &sep5,
            &quit,
        ],
    )
}

pub fn rebuild_tray_menu(handle: &AppHandle, s: &Settings) -> tauri::Result<()> {
    if let Some(tray) = handle.tray_by_id(TRAY_ID) {
        let menu = build_tray_menu(handle, s)?;
        tray.set_menu(Some(menu))?;
    }
    Ok(())
}

pub fn open_caption_window(handle: &AppHandle) -> tauri::Result<()> {
    if let Some(win) = handle.get_webview_window("caption") {
        let _ = win.show();
        let _ = win.set_focus();
        return Ok(());
    }

    let _win = WebviewWindowBuilder::new(handle, "caption", WebviewUrl::App("caption.html".into()))
        .title("Translator")
        .inner_size(900.0, 300.0)
        .min_inner_size(500.0, 300.0)
        .decorations(false)
        .always_on_top(true)
        .resizable(true)
        .center()
        .build()?;

    Ok(())
}

pub fn open_settings_window(handle: &AppHandle) -> tauri::Result<()> {
    if let Some(win) = handle.get_webview_window("settings") {
        let _ = win.show();
        let _ = win.set_focus();
        return Ok(());
    }

    let _win =
        WebviewWindowBuilder::new(handle, "settings", WebviewUrl::App("settings.html".into()))
            .title("Translator Settings")
            .inner_size(480.0, 640.0)
            .min_inner_size(400.0, 400.0)
            .decorations(true)
            .always_on_top(true)
            .resizable(true)
            .center()
            .build()?;

    Ok(())
}

pub fn open_voice_input_window(handle: &AppHandle) -> tauri::Result<()> {
    if let Some(win) = handle.get_webview_window("voice-input") {
        let _ = win.show();
        return Ok(());
    }

    let builder = WebviewWindowBuilder::new(
        handle,
        "voice-input",
        WebviewUrl::App("voice-input.html".into()),
    )
    .title("Voice Input")
    .inner_size(480.0, 48.0)
    .decorations(false)
    .transparent(true)
    .always_on_top(true)
    .resizable(false);

    let monitor = handle.primary_monitor().ok().flatten().or_else(|| {
        handle
            .available_monitors()
            .ok()
            .and_then(|m| m.into_iter().next())
    });

    let (screen_w, screen_h) = monitor
        .as_ref()
        .map(|m| {
            let s = m.size();
            let sf = m.scale_factor();
            (s.width as f64 / sf, s.height as f64 / sf)
        })
        .unwrap_or((1440.0, 900.0));

    let win_w = 480.0;
    let win_h = 48.0;
    let x = (screen_w - win_w) / 2.0;
    let y = screen_h - win_h - 80.0;

    let _win = builder.position(x, y).build()?;

    #[cfg(target_os = "macos")]
    {
        use objc2::msg_send;
        let ns_win = _win.ns_window().unwrap() as *mut objc2::runtime::AnyObject;
        unsafe {
            let style_mask: usize = msg_send![ns_win, styleMask];
            let non_activating: usize = 1 << 7;
            let _: () = msg_send![ns_win, setStyleMask: style_mask | non_activating];
            let _: () = msg_send![ns_win, setHidesOnDeactivate: false];
        }
    }

    Ok(())
}

pub fn open_subtitle_window(handle: &AppHandle) -> tauri::Result<()> {
    if let Some(win) = handle.get_webview_window("subtitle") {
        let _ = win.show();
        return Ok(());
    }

    let monitor = handle.primary_monitor().ok().flatten().or_else(|| {
        handle
            .available_monitors()
            .ok()
            .and_then(|m| m.into_iter().next())
    });

    let (w, h) = monitor
        .as_ref()
        .map(|m| {
            let s = m.size();
            let sf = m.scale_factor();
            (s.width as f64 / sf, s.height as f64 / sf)
        })
        .unwrap_or((1440.0, 900.0));

    let _win =
        WebviewWindowBuilder::new(handle, "subtitle", WebviewUrl::App("subtitle.html".into()))
            .title("")
            .inner_size(w, h * 0.25)
            .position(0.0, h * 0.75)
            .decorations(false)
            .transparent(true)
            .always_on_top(true)
            .resizable(false)
            .skip_taskbar(true)
            .build()?;

    #[cfg(target_os = "macos")]
    unsafe {
        use std::ffi::CStr;
        let ns_win = _win.ns_window().unwrap() as *mut objc2::runtime::AnyObject;
        let cls = objc2::runtime::AnyClass::get(CStr::from_bytes_with_nul(b"NSColor\0").unwrap())
            .unwrap();
        let clear_color: *mut objc2::runtime::AnyObject = objc2::msg_send![cls, clearColor];
        let _: () = objc2::msg_send![ns_win, setBackgroundColor: clear_color];
        let _: () = objc2::msg_send![ns_win, setOpaque: false];
        let _: () = objc2::msg_send![ns_win, setHasShadow: false];
        let _: () = objc2::msg_send![ns_win, setIgnoresMouseEvents: true];
    }

    Ok(())
}

pub fn close_subtitle_window(handle: &AppHandle) {
    if let Some(win) = handle.get_webview_window("subtitle") {
        let _ = win.destroy();
    }
}

fn emit_to_caption(app: &AppHandle, event: &str, payload: &str) {
    if let Some(win) = app.get_webview_window("caption") {
        let _ = win.emit(event, payload);
    }
}

pub fn handle_tray_event(app: &AppHandle, id: &str) {
    if id == "start" {
        let was_translating = IS_TRANSLATING.load(Ordering::Relaxed);
        IS_TRANSLATING.store(!was_translating, Ordering::Relaxed);

        let _ = open_caption_window(app);
        emit_to_caption(app, "menu-event", "start");

        let s = app.state::<SettingsState>().0.lock().unwrap().clone();
        let _ = rebuild_tray_menu(app, &s);
        return;
    }

    if id == "settings" {
        let _ = open_settings_window(app);
        return;
    }

    if id == "voice-input" {
        let _ = open_voice_input_window(app);
        return;
    }

    if id == "view-history" {
        let _ = open_settings_window(app);
        if let Some(win) = app.get_webview_window("settings") {
            let _ = win.emit("navigate", "history");
        }
        return;
    }

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
    } else if id == "subtitle-toggle" {
        settings.subtitle_mode = !settings.subtitle_mode;
        if settings.subtitle_mode {
            let _ = open_subtitle_window(app);
        } else {
            close_subtitle_window(app);
        }
        changed = true;
    }

    if changed {
        let _ = settings.save();
        let s = settings.clone();
        drop(settings);
        let _ = rebuild_tray_menu(app, &s);

        emit_to_caption(app, "settings-changed", "");
        if let Some(win) = app.get_webview_window("settings") {
            let _ = win.emit("settings-changed", "");
        }
    }
}

pub fn is_translating() -> bool {
    IS_TRANSLATING.load(Ordering::Relaxed)
}

pub fn set_translating(app: &AppHandle, active: bool) {
    IS_TRANSLATING.store(active, Ordering::Relaxed);
    let s = app.state::<SettingsState>().0.lock().unwrap().clone();
    let _ = rebuild_tray_menu(app, &s);
}
