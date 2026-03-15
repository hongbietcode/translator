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
  max_lines: number;
  show_original: boolean;
  custom_context: CustomContext | null;
  subtitle_mode: boolean;
  background_color: string;
  text_color: string;
  subtitle_font_size: number;
  subtitle_bg_color: string;
  subtitle_text_color: string;
  subtitle_show_original: boolean;
  anthropic_api_key: string;
  ai_enabled: boolean;
  ai_model: string;
}

export const DEFAULT_SETTINGS: Settings = {
  soniox_api_key: "",
  source_language: "auto",
  target_language: "vi",
  audio_source: "system",
  overlay_opacity: 0.85,
  font_size: 16,
  max_lines: 5,
  show_original: true,
  custom_context: null,
  subtitle_mode: false,
  background_color: "#1a1a2e",
  text_color: "#ffffff",
  subtitle_font_size: 28,
  subtitle_bg_color: "rgba(0,0,0,0.75)",
  subtitle_text_color: "#ffffff",
  subtitle_show_original: true,
  anthropic_api_key: "",
  ai_enabled: false,
  ai_model: "claude-haiku-4-5-20251001",
};
