use std::process::Command;
use std::time::Duration;
use tokio::time::sleep;

fn run_osascript(script: &str) -> Result<String, String> {
    let output = Command::new("osascript")
        .arg("-e")
        .arg(script)
        .output()
        .map_err(|e| format!("Failed to run osascript: {}", e))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(String::from_utf8_lossy(&output.stderr).trim().to_string())
    }
}

fn save_clipboard() -> Result<String, String> {
    run_osascript("the clipboard as text")
}

fn set_clipboard(text: &str) -> Result<(), String> {
    let mut child = Command::new("pbcopy")
        .stdin(std::process::Stdio::piped())
        .spawn()
        .map_err(|e| format!("Failed to spawn pbcopy: {}", e))?;

    if let Some(mut stdin) = child.stdin.take() {
        use std::io::Write;
        stdin
            .write_all(text.as_bytes())
            .map_err(|e| format!("Failed to write to pbcopy: {}", e))?;
    }

    child
        .wait()
        .map_err(|e| format!("pbcopy failed: {}", e))?;
    Ok(())
}

fn simulate_paste() -> Result<(), String> {
    run_osascript(
        "tell application \"System Events\" to keystroke \"v\" using command down",
    )?;
    Ok(())
}

fn simulate_enter() -> Result<(), String> {
    run_osascript("tell application \"System Events\" to keystroke return")?;
    Ok(())
}

fn restore_clipboard(original: &str) -> Result<(), String> {
    set_clipboard(original)
}

/// Insert text at cursor position in focused app via clipboard + Cmd+V
#[tauri::command]
pub async fn insert_text_at_cursor(text: String, press_enter: bool) -> Result<(), String> {
    let original_clipboard = save_clipboard().unwrap_or_default();

    set_clipboard(&text)?;

    let delay = if text.len() > 200 { 700 } else { 200 };
    sleep(Duration::from_millis(delay)).await;

    let mut last_err = None;
    for attempt in 0..2 {
        match simulate_paste() {
            Ok(_) => {
                last_err = None;
                break;
            }
            Err(e) => {
                last_err = Some(e);
                if attempt < 1 {
                    sleep(Duration::from_millis(75)).await;
                }
            }
        }
    }

    if let Some(err) = last_err {
        let _ = restore_clipboard(&original_clipboard);
        return Err(format!("Failed to paste: {}", err));
    }

    if press_enter {
        sleep(Duration::from_millis(100)).await;
        simulate_enter().map_err(|e| format!("Failed to press Enter: {}", e))?;
    }

    sleep(Duration::from_millis(200)).await;
    let _ = restore_clipboard(&original_clipboard);

    Ok(())
}

/// Check if accessibility permission is granted (AXIsProcessTrusted)
#[tauri::command]
pub fn check_accessibility_permission() -> bool {
    run_osascript(
        "tell application \"System Events\" to return (exists process 1)",
    )
    .is_ok()
}
