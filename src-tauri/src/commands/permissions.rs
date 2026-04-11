use serde::Serialize;
use std::process::Command;

#[derive(Serialize, Clone)]
pub struct PermissionDetail {
    pub granted: bool,
    pub name: String,
    pub description: String,
}

#[derive(Serialize, Clone)]
pub struct AllPermissions {
    pub screen_recording: PermissionDetail,
    pub microphone: PermissionDetail,
    pub accessibility: PermissionDetail,
    pub all_granted: bool,
}

fn check_screen_recording_granted() -> bool {
    #[cfg(target_os = "macos")]
    {
        extern "C" {
            fn CGPreflightScreenCaptureAccess() -> bool;
        }
        unsafe { CGPreflightScreenCaptureAccess() }
    }
    #[cfg(not(target_os = "macos"))]
    true
}

fn check_microphone_granted() -> bool {
    #[cfg(target_os = "macos")]
    {
        let output = Command::new("osascript")
            .arg("-e")
            .arg(
                r#"use framework "AVFoundation"
set authStatus to current application's AVCaptureDevice's authorizationStatusForMediaType:(current application's AVMediaTypeAudio)
if authStatus is 3 then
    return "granted"
else
    return "denied"
end if"#,
            )
            .output();

        match output {
            Ok(o) if o.status.success() => {
                let result = String::from_utf8_lossy(&o.stdout).trim().to_string();
                result == "granted"
            }
            _ => false,
        }
    }
    #[cfg(not(target_os = "macos"))]
    true
}

fn check_accessibility_granted() -> bool {
    #[cfg(target_os = "macos")]
    {
        extern "C" {
            fn AXIsProcessTrusted() -> bool;
        }
        unsafe { AXIsProcessTrusted() }
    }
    #[cfg(not(target_os = "macos"))]
    true
}

#[tauri::command]
pub fn check_all_permissions() -> AllPermissions {
    let screen = check_screen_recording_granted();
    let mic = check_microphone_granted();
    let accessibility = check_accessibility_granted();

    AllPermissions {
        screen_recording: PermissionDetail {
            granted: screen,
            name: "Screen Recording".to_string(),
            description: "Required to capture system audio for translation".to_string(),
        },
        microphone: PermissionDetail {
            granted: mic,
            name: "Microphone".to_string(),
            description: "Required for voice input and speech recognition".to_string(),
        },
        accessibility: PermissionDetail {
            granted: accessibility,
            name: "Accessibility".to_string(),
            description: "Required to insert text at cursor position".to_string(),
        },
        all_granted: screen && mic && accessibility,
    }
}

#[tauri::command]
pub fn request_screen_recording() -> bool {
    #[cfg(target_os = "macos")]
    {
        extern "C" {
            fn CGRequestScreenCaptureAccess() -> bool;
        }
        unsafe { CGRequestScreenCaptureAccess() }
    }
    #[cfg(not(target_os = "macos"))]
    true
}

#[tauri::command]
pub fn open_permission_settings(permission_type: String) -> Result<(), String> {
    let url = match permission_type.as_str() {
        "screen_recording" => {
            "x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture"
        }
        "microphone" => {
            "x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone"
        }
        "accessibility" => {
            "x-apple.systempreferences:com.apple.preference.security?Privacy_Accessibility"
        }
        _ => return Err(format!("Unknown permission type: {}", permission_type)),
    };

    Command::new("open")
        .arg(url)
        .spawn()
        .map_err(|e| format!("Failed to open System Settings: {}", e))?;

    Ok(())
}
