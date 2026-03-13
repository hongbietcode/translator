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
};
