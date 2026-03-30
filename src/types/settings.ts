export interface CustomContext {
  domain: string;
  terms: string[];
}

export interface Settings {
  soniox_api_key: string;
  source_language: string;
  target_language: string;
  audio_source: string;
  overlay_opacity: number;
  font_size: number;
  show_original: boolean;
  custom_context: CustomContext | null;
  subtitle_mode: boolean;
  background_color: string;
  text_color: string;
  subtitle_font_size: number;
  subtitle_bg_color: string;
  subtitle_text_color: string;
  subtitle_show_original: boolean;
  voice_input_shortcut: string;
  voice_stop_word: string;
  voice_enter_mode: boolean;
  voice_endpoint_delay_ms: number;
  llm_correction_enabled: boolean;
  llm_correction_api_key: string;
  llm_correction_base_url: string;
  llm_correction_model: string;
  llm_correction_language: string;
}

export const DEFAULT_SETTINGS: Settings = {
  soniox_api_key: "",
  source_language: "auto",
  target_language: "vi",
  audio_source: "system",
  overlay_opacity: 0.85,
  font_size: 16,
  show_original: true,
  custom_context: null,
  subtitle_mode: false,
  background_color: "#1a1a2e",
  text_color: "#ffffff",
  subtitle_font_size: 28,
  subtitle_bg_color: "rgba(0,0,0,0.75)",
  subtitle_text_color: "#ffffff",
  subtitle_show_original: true,
  voice_input_shortcut: "CmdOrCtrl+L",
  voice_stop_word: "",
  voice_enter_mode: false,
  voice_endpoint_delay_ms: 1500,
  llm_correction_enabled: false,
  llm_correction_api_key: "",
  llm_correction_base_url: "https://api.openai.com/v1",
  llm_correction_model: "gpt-4o-mini",
  llm_correction_language: "auto",
};
