use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::sync::Mutex;

/// Custom context for Soniox — provides domain-specific hints
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct CustomContext {
    pub domain: String,
    pub terms: Vec<String>,
}

/// App settings — persisted to JSON
#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    /// Soniox API key
    pub soniox_api_key: String,
    /// Source language: "auto" or ISO 639-1 code
    pub source_language: String,
    /// Target language: ISO 639-1 code
    pub target_language: String,
    /// Audio source: "system" | "microphone" | "both"
    pub audio_source: String,
    /// Overlay opacity: 0.0 - 1.0
    pub overlay_opacity: f64,
    /// Font size in px
    pub font_size: u32,
    /// Max transcript lines to display
    pub max_lines: u32,
    /// Whether to show original text alongside translation
    pub show_original: bool,
    /// Optional custom context for better transcription
    pub custom_context: Option<CustomContext>,
    /// Netflix-style subtitle mode
    #[serde(default)]
    pub subtitle_mode: bool,
    /// Background color for caption window
    #[serde(default = "default_bg_color")]
    pub background_color: String,
    /// Text color for caption window
    #[serde(default = "default_text_color")]
    pub text_color: String,
    /// Font size for subtitle overlay
    #[serde(default = "default_subtitle_font_size")]
    pub subtitle_font_size: u32,
    /// Background color for subtitle overlay
    #[serde(default = "default_subtitle_bg_color")]
    pub subtitle_bg_color: String,
    /// Text color for subtitle overlay
    #[serde(default = "default_subtitle_text_color")]
    pub subtitle_text_color: String,
    /// Whether to show original text in subtitle overlay
    #[serde(default = "default_true")]
    pub subtitle_show_original: bool,
    /// Vocabulary terms for improved Soniox recognition
    #[serde(default)]
    pub vocabulary_terms: Vec<String>,
    /// Global shortcut for voice input
    #[serde(default = "default_voice_input_shortcut")]
    pub voice_input_shortcut: String,
    /// Stop word to end voice recording (empty = disabled)
    #[serde(default)]
    pub voice_stop_word: String,
    /// Auto-press Enter after text insertion
    #[serde(default)]
    pub voice_enter_mode: bool,
    /// Endpoint detection delay in milliseconds
    #[serde(default = "default_voice_endpoint_delay_ms")]
    pub voice_endpoint_delay_ms: u32,
    /// Enable LLM-based transcript correction
    #[serde(default)]
    pub llm_correction_enabled: bool,
    /// LLM correction API key
    #[serde(default)]
    pub llm_correction_api_key: String,
    /// LLM correction API base URL (OpenAI-compatible)
    #[serde(default = "default_llm_correction_base_url")]
    pub llm_correction_base_url: String,
    /// LLM correction model name
    #[serde(default = "default_llm_correction_model")]
    pub llm_correction_model: String,
    /// LLM correction output language
    #[serde(default = "default_llm_correction_language")]
    pub llm_correction_language: String,
}

fn default_bg_color() -> String { "#1a1a2e".to_string() }
fn default_text_color() -> String { "#ffffff".to_string() }
fn default_true() -> bool { true }
fn default_subtitle_font_size() -> u32 { 28 }
fn default_subtitle_bg_color() -> String { "rgba(0,0,0,0.75)".to_string() }
fn default_subtitle_text_color() -> String { "#ffffff".to_string() }

fn default_voice_input_shortcut() -> String {
    "CmdOrCtrl+L".to_string()
}

fn default_voice_endpoint_delay_ms() -> u32 {
    1500
}

fn default_llm_correction_base_url() -> String {
    "https://api.openai.com/v1".to_string()
}

fn default_llm_correction_model() -> String {
    "gpt-4o-mini".to_string()
}

fn default_llm_correction_language() -> String {
    "auto".to_string()
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            soniox_api_key: String::new(),
            source_language: "auto".to_string(),
            target_language: "vi".to_string(),
            audio_source: "system".to_string(),
            overlay_opacity: 0.85,
            font_size: 16,
            max_lines: 5,
            show_original: true,
            custom_context: None,
            subtitle_mode: false,
            background_color: default_bg_color(),
            text_color: default_text_color(),
            subtitle_font_size: default_subtitle_font_size(),
            subtitle_bg_color: default_subtitle_bg_color(),
            subtitle_text_color: default_subtitle_text_color(),
            subtitle_show_original: true,
            vocabulary_terms: Vec::new(),
            voice_input_shortcut: default_voice_input_shortcut(),
            voice_stop_word: String::new(),
            voice_enter_mode: false,
            voice_endpoint_delay_ms: default_voice_endpoint_delay_ms(),
            llm_correction_enabled: false,
            llm_correction_api_key: String::new(),
            llm_correction_base_url: default_llm_correction_base_url(),
            llm_correction_model: default_llm_correction_model(),
            llm_correction_language: default_llm_correction_language(),
        }
    }
}

/// Get the settings file path
/// ~/Library/Application Support/com.personal.translator/settings.json
fn settings_path() -> PathBuf {
    let mut path = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("com.personal.translator");
    path.push("settings.json");
    path
}

impl Settings {
    /// Load settings from disk, or return defaults
    pub fn load() -> Self {
        let path = settings_path();
        if path.exists() {
            match fs::read_to_string(&path) {
                Ok(content) => serde_json::from_str(&content).unwrap_or_default(),
                Err(_) => Self::default(),
            }
        } else {
            Self::default()
        }
    }

    /// Save settings to disk
    pub fn save(&self) -> Result<(), String> {
        let path = settings_path();

        // Ensure parent directory exists
        if let Some(parent) = path.parent() {
            fs::create_dir_all(parent).map_err(|e| format!("Failed to create config dir: {}", e))?;
        }

        let json =
            serde_json::to_string_pretty(self).map_err(|e| format!("Failed to serialize: {}", e))?;

        fs::write(&path, json).map_err(|e| format!("Failed to write settings: {}", e))?;

        Ok(())
    }
}

/// Thread-safe settings state managed by Tauri
pub struct SettingsState(pub Mutex<Settings>);
