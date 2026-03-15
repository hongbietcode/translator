import { useState, useEffect } from "react";
import type { Settings } from "@/types/settings";
import { openUrl } from "@tauri-apps/plugin-opener";

const LANGUAGES = [
  { value: "auto", label: "Auto-detect" },
  { value: "en", label: "English" },
  { value: "ja", label: "Japanese" },
  { value: "ko", label: "Korean" },
  { value: "zh", label: "Chinese" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "es", label: "Spanish" },
  { value: "vi", label: "Vietnamese" },
  { value: "th", label: "Thai" },
  { value: "id", label: "Indonesian" },
];

const TARGET_LANGUAGES = LANGUAGES.filter((l) => l.value !== "auto");

interface SettingsViewProps {
  settings: Settings;
  onSave: (settings: Partial<Settings>) => Promise<void>;
  onToast: (message: string, type: "success" | "error" | "info") => void;
}

export function SettingsView({ settings, onSave, onToast }: SettingsViewProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("vi");
  const [audioSource, setAudioSource] = useState("system");
  const [opacity, setOpacity] = useState(85);
  const [fontSize, setFontSize] = useState(16);
  const [showOriginal, setShowOriginal] = useState(true);
  const [bgColor, setBgColor] = useState("#1a1a2e");
  const [textColor, setTextColor] = useState("#ffffff");
  const [subtitleFontSize, setSubtitleFontSize] = useState(28);
  const [subtitleBgColor, setSubtitleBgColor] = useState("rgba(0,0,0,0.75)");
  const [subtitleTextColor, setSubtitleTextColor] = useState("#ffffff");
  const [subtitleShowOriginal, setSubtitleShowOriginal] = useState(true);
  const [contextDomain, setContextDomain] = useState("");
  const [contextTerms, setContextTerms] = useState("");
  const [anthropicKey, setAnthropicKey] = useState("");
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiModel, setAiModel] = useState("claude-haiku-4-5-20251001");

  useEffect(() => {
    setApiKey(settings.soniox_api_key || "");
    setSourceLang(settings.source_language || "auto");
    setTargetLang(settings.target_language || "vi");
    setAudioSource(settings.audio_source || "system");
    setOpacity(Math.round((settings.overlay_opacity || 0.85) * 100));
    setFontSize(settings.font_size || 16);
    setShowOriginal(settings.show_original !== false);
    setBgColor(settings.background_color || "#1a1a2e");
    setTextColor(settings.text_color || "#ffffff");
    setSubtitleFontSize(settings.subtitle_font_size || 28);
    setSubtitleBgColor(settings.subtitle_bg_color || "rgba(0,0,0,0.75)");
    setSubtitleTextColor(settings.subtitle_text_color || "#ffffff");
    setSubtitleShowOriginal(settings.subtitle_show_original !== false);
    setContextDomain(settings.custom_context?.domain || "");
    setContextTerms((settings.custom_context?.terms || []).join(", "));
    setAnthropicKey(settings.anthropic_api_key || "");
    setAiEnabled(settings.ai_enabled || false);
    setAiModel(settings.ai_model || "claude-haiku-4-5-20251001");
  }, [settings]);

  const handleSave = async () => {
    const newSettings: Partial<Settings> = {
      soniox_api_key: apiKey.trim(),
      source_language: sourceLang,
      target_language: targetLang,
      audio_source: audioSource,
      overlay_opacity: opacity / 100,
      font_size: fontSize,
      show_original: showOriginal,
      background_color: bgColor,
      text_color: textColor,
      subtitle_font_size: subtitleFontSize,
      subtitle_bg_color: subtitleBgColor,
      subtitle_text_color: subtitleTextColor,
      subtitle_show_original: subtitleShowOriginal,
      custom_context: null,
      anthropic_api_key: anthropicKey.trim(),
      ai_enabled: aiEnabled,
      ai_model: aiModel,
    };

    const domain = contextDomain.trim();
    if (domain) {
      const terms = contextTerms
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      newSettings.custom_context = { domain, terms };
    }

    try {
      await onSave(newSettings);
      onToast("Settings saved", "success");
    } catch (err) {
      onToast(`Failed to save: ${err}`, "error");
    }
  };

  return (
    <div className="view-shell">
      <div className="view-header">
        <h2 className="view-header-title">Settings</h2>
      </div>

      <div className="s-body">
        <div className="s-card">
          <div className="s-card-header">
            <KeyIcon />
            <span>API Key</span>
          </div>
          <div className="s-key-row">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Soniox API key..."
              className="input-field"
              autoComplete="off"
            />
            <button onClick={() => setShowKey(!showKey)} className="s-icon-btn" title="Show/Hide">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                {showKey ? (
                  <>
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                    <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                    <line x1="1" y1="1" x2="23" y2="23" />
                  </>
                ) : (
                  <>
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </>
                )}
              </svg>
            </button>
          </div>
          <p className="s-hint">
            Get your key at{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                openUrl("https://console.soniox.com/signup/");
              }}
            >
              console.soniox.com
            </a>
          </p>
        </div>

        <div className="s-card">
          <div className="s-card-header">
            <GlobeIcon />
            <span>Languages</span>
          </div>
          <div className="s-lang-grid">
            <div className="s-field">
              <span className="s-field-label">Source</span>
              <select value={sourceLang} onChange={(e) => setSourceLang(e.target.value)} className="select-field">
                {LANGUAGES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div className="s-arrow">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.35">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </div>
            <div className="s-field">
              <span className="s-field-label">Target</span>
              <select value={targetLang} onChange={(e) => setTargetLang(e.target.value)} className="select-field">
                {TARGET_LANGUAGES.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        <div className="s-card">
          <div className="s-card-header">
            <MicIcon />
            <span>Audio Source</span>
          </div>
          <div className="s-pill-group">
            {[
              { value: "system", label: "System", icon: <SpeakerIcon /> },
              { value: "microphone", label: "Mic", icon: <MicIcon /> },
              { value: "both", label: "Both", icon: <BothIcon /> },
            ].map((o) => (
              <button
                key={o.value}
                className={`s-pill ${audioSource === o.value ? "s-pill--active" : ""}`}
                onClick={() => setAudioSource(o.value)}
              >
                {o.icon}
                {o.label}
              </button>
            ))}
          </div>
        </div>

        <div className="s-card">
          <div className="s-card-header">
            <MonitorIcon />
            <span>Caption Display</span>
          </div>
          <div className="s-display-grid">
            <div className="s-display-item">
              <span className="s-field-label">Opacity</span>
              <div className="s-chip-row">
                {[50, 70, 85, 100].map((o) => (
                  <button key={o} className={`s-chip ${opacity === o ? "s-chip--active" : ""}`} onClick={() => setOpacity(o)}>
                    {o}%
                  </button>
                ))}
              </div>
            </div>
            <div className="s-display-item">
              <span className="s-field-label">Font Size</span>
              <div className="s-chip-row">
                {[12, 14, 16, 18, 20].map((o) => (
                  <button key={o} className={`s-chip ${fontSize === o ? "s-chip--active" : ""}`} onClick={() => setFontSize(o)}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <label className="s-toggle-row">
            <span>Show original text</span>
            <div className={`s-switch ${showOriginal ? "s-switch--on" : ""}`} onClick={() => setShowOriginal(!showOriginal)}>
              <div className="s-switch-thumb" />
            </div>
          </label>
          <div className="s-color-row">
            <div className="s-color-field">
              <span className="s-field-label">Background</span>
              <div className="s-color-input">
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
                <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)} className="input-field s-color-hex" />
              </div>
            </div>
            <div className="s-color-field">
              <span className="s-field-label">Text Color</span>
              <div className="s-color-input">
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
                <input type="text" value={textColor} onChange={(e) => setTextColor(e.target.value)} className="input-field s-color-hex" />
              </div>
            </div>
          </div>
        </div>

        <div className="s-card">
          <div className="s-card-header">
            <SubtitleIcon />
            <span>Subtitle Display</span>
          </div>
          <div className="s-display-grid">
            <div className="s-display-item">
              <span className="s-field-label">Font Size</span>
              <div className="s-chip-row">
                {[20, 24, 28, 32, 36].map((o) => (
                  <button key={o} className={`s-chip ${subtitleFontSize === o ? "s-chip--active" : ""}`} onClick={() => setSubtitleFontSize(o)}>
                    {o}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="s-color-row">
            <div className="s-color-field">
              <span className="s-field-label">Background</span>
              <div className="s-color-input">
                <input type="text" value={subtitleBgColor} onChange={(e) => setSubtitleBgColor(e.target.value)} className="input-field" />
              </div>
            </div>
            <div className="s-color-field">
              <span className="s-field-label">Text Color</span>
              <div className="s-color-input">
                <input type="color" value={subtitleTextColor} onChange={(e) => setSubtitleTextColor(e.target.value)} />
                <input type="text" value={subtitleTextColor} onChange={(e) => setSubtitleTextColor(e.target.value)} className="input-field s-color-hex" />
              </div>
            </div>
          </div>
          <label className="s-toggle-row">
            <span>Show original text</span>
            <div className={`s-switch ${subtitleShowOriginal ? "s-switch--on" : ""}`} onClick={() => setSubtitleShowOriginal(!subtitleShowOriginal)}>
              <div className="s-switch-thumb" />
            </div>
          </label>
        </div>

        <div className="s-card">
          <div className="s-card-header">
            <DocIcon />
            <span>Context</span>
            <span className="s-badge">Optional</span>
          </div>
          <div className="s-field">
            <span className="s-field-label">Domain</span>
            <input
              type="text"
              value={contextDomain}
              onChange={(e) => setContextDomain(e.target.value)}
              placeholder="e.g. Meeting, Technical, Medical..."
              className="input-field"
            />
          </div>
          <div className="s-field" style={{ marginTop: 8 }}>
            <span className="s-field-label">Terms</span>
            <input
              type="text"
              value={contextTerms}
              onChange={(e) => setContextTerms(e.target.value)}
              placeholder="e.g. sprint, deploy, kubernetes..."
              className="input-field"
            />
          </div>
          <p className="s-hint">Comma-separated terms to improve accuracy</p>
        </div>

        <div className="s-card">
          <div className="s-card-header">
            <SparkleIcon />
            <span>AI Assistant</span>
          </div>
          <label className="s-toggle-row">
            <span>Enable AI Assistant</span>
            <div className={`s-switch ${aiEnabled ? "s-switch--on" : ""}`} onClick={() => setAiEnabled(!aiEnabled)}>
              <div className="s-switch-thumb" />
            </div>
          </label>
          <div className="s-field" style={{ marginTop: 8 }}>
            <span className="s-field-label">Anthropic API Key</span>
            <div className="s-key-row">
              <input
                type={showAnthropicKey ? "text" : "password"}
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="Enter your Anthropic API key..."
                className="input-field"
                autoComplete="off"
              />
              <button onClick={() => setShowAnthropicKey(!showAnthropicKey)} className="s-icon-btn" title="Show/Hide">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  {showAnthropicKey ? (
                    <>
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
                      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </>
                  ) : (
                    <>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </>
                  )}
                </svg>
              </button>
            </div>
            <p className="s-hint">
              Get your key at{" "}
              <a
                href="#"
                onClick={(e) => {
                  e.preventDefault();
                  openUrl("https://console.anthropic.com/");
                }}
              >
                console.anthropic.com
              </a>
            </p>
          </div>
          <div className="s-field" style={{ marginTop: 8 }}>
            <span className="s-field-label">Model</span>
            <select value={aiModel} onChange={(e) => setAiModel(e.target.value)} className="select-field">
              <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 (Fast)</option>
              <option value="claude-sonnet-4-6">Claude Sonnet 4.6 (Balanced)</option>
              <option value="claude-opus-4-6">Claude Opus 4.6 (Best)</option>
            </select>
          </div>
        </div>

        <button onClick={handleSave} className="btn-save">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Save & Close
        </button>
      </div>
    </div>
  );
}

function KeyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    </svg>
  );
}

function SpeakerIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function BothIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function SparkleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
    </svg>
  );
}

function SubtitleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <line x1="6" y1="14" x2="18" y2="14" />
      <line x1="8" y1="18" x2="16" y2="18" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
