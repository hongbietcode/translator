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
  onBack: () => void;
  onToast: (message: string, type: "success" | "error" | "info") => void;
}

export function SettingsView({ settings, onSave, onBack, onToast }: SettingsViewProps) {
  const [apiKey, setApiKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [sourceLang, setSourceLang] = useState("auto");
  const [targetLang, setTargetLang] = useState("vi");
  const [audioSource, setAudioSource] = useState("system");
  const [opacity, setOpacity] = useState(85);
  const [fontSize, setFontSize] = useState(16);
  const [maxLines, setMaxLines] = useState(5);
  const [showOriginal, setShowOriginal] = useState(true);
  const [contextDomain, setContextDomain] = useState("");
  const [contextTerms, setContextTerms] = useState("");

  useEffect(() => {
    setApiKey(settings.soniox_api_key || "");
    setSourceLang(settings.source_language || "auto");
    setTargetLang(settings.target_language || "vi");
    setAudioSource(settings.audio_source || "system");
    setOpacity(Math.round((settings.overlay_opacity || 0.85) * 100));
    setFontSize(settings.font_size || 16);
    setMaxLines(settings.max_lines || 5);
    setShowOriginal(settings.show_original !== false);
    setContextDomain(settings.custom_context?.domain || "");
    setContextTerms((settings.custom_context?.terms || []).join(", "));
  }, [settings]);

  const handleSave = async () => {
    const newSettings: Partial<Settings> = {
      soniox_api_key: apiKey.trim(),
      source_language: sourceLang,
      target_language: targetLang,
      audio_source: audioSource,
      overlay_opacity: opacity / 100,
      font_size: fontSize,
      max_lines: maxLines,
      show_original: showOriginal,
      custom_context: null,
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
      onBack();
    } catch (err) {
      onToast(`Failed to save: ${err}`, "error");
    }
  };

  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-border bg-background shadow-lg overflow-hidden animate-[fade-in-up_250ms_ease-out]">
      <ViewHeader title="Settings" onBack={onBack} />

      <div className="flex-1 overflow-y-auto px-4 py-3">
        <Section icon={<KeyIcon />} label="Soniox API Key">
          <div className="flex gap-1">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Soniox API key..."
              className="flex-1 px-3 py-2 border border-border rounded-sm bg-background text-foreground text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
              autoComplete="off"
            />
            <button
              onClick={() => setShowKey(!showKey)}
              className="flex items-center justify-center w-7 h-7 border-none rounded-sm bg-transparent text-muted-foreground cursor-pointer hover:bg-accent/5 hover:text-foreground"
              title="Show/Hide"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Get your key at{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                openUrl("https://console.soniox.com/signup/");
              }}
              className="text-accent hover:underline"
            >
              console.soniox.com
            </a>
          </p>
        </Section>

        <Section icon={<GlobeIcon />} label="Languages">
          <div className="grid grid-cols-2 gap-2">
            <SelectField label="Source" value={sourceLang} onChange={setSourceLang} options={LANGUAGES} />
            <SelectField label="Target" value={targetLang} onChange={setTargetLang} options={TARGET_LANGUAGES} />
          </div>
        </Section>

        <Section icon={<MicIcon />} label="Audio Source">
          <RadioGroup
            name="audio-source"
            value={audioSource}
            onChange={setAudioSource}
            options={[
              { value: "system", label: "System" },
              { value: "microphone", label: "Microphone" },
              { value: "both", label: "Both" },
            ]}
          />
        </Section>

        <Section icon={<MonitorIcon />} label="Display">
          <RadioField label="Opacity" name="opacity" value={opacity} onChange={setOpacity} options={[50, 70, 85, 100]} suffix="%" />
          <RadioField label="Font Size" name="font-size" value={fontSize} onChange={setFontSize} options={[12, 14, 16, 18, 20]} />
          <RadioField label="Max Lines" name="max-lines" value={maxLines} onChange={setMaxLines} options={[3, 5, 8, 10]} />
          <label className="flex items-center gap-2 cursor-pointer py-1">
            <input
              type="checkbox"
              checked={showOriginal}
              onChange={(e) => setShowOriginal(e.target.checked)}
              className="size-4 border-2 border-muted-foreground rounded accent-accent cursor-pointer"
            />
            <span className="text-sm text-text-2">Show original text</span>
          </label>
        </Section>

        <Section icon={<DocIcon />} label="Context" badge="Optional">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-medium text-muted-foreground">Domain</span>
            <input
              type="text"
              value={contextDomain}
              onChange={(e) => setContextDomain(e.target.value)}
              placeholder="e.g. Meeting, Technical, Medical..."
              className="px-3 py-2 border border-border rounded-sm bg-background text-foreground text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
            />
          </div>
          <div className="flex flex-col gap-1 mt-2">
            <span className="text-xs font-medium text-muted-foreground">Terms</span>
            <input
              type="text"
              value={contextTerms}
              onChange={(e) => setContextTerms(e.target.value)}
              placeholder="e.g. sprint, deploy, kubernetes..."
              className="px-3 py-2 border border-border rounded-sm bg-background text-foreground text-sm outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">Comma-separated terms to improve accuracy</p>
        </Section>

        <button
          onClick={handleSave}
          className="flex items-center justify-center gap-2 w-full py-2 px-4 border-none rounded-sm bg-accent text-white text-sm font-semibold cursor-pointer transition-all hover:bg-accent-dark hover:shadow-md active:scale-[0.98]"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Save & Close
        </button>
      </div>
    </div>
  );
}

function ViewHeader({ title, onBack, rightAction }: { title: string; onBack: () => void; rightAction?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between h-10 px-2 border-b border-border bg-muted shrink-0" data-tauri-drag-region>
      <button
        onClick={onBack}
        className="flex items-center justify-center size-8 border-none rounded-sm bg-transparent text-muted-foreground cursor-pointer hover:bg-accent/5 hover:text-foreground [-webkit-app-region:no-drag]"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="19" y1="12" x2="5" y2="12" />
          <polyline points="12 19 5 12 12 5" />
        </svg>
      </button>
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
      {rightAction || <div className="w-8" />}
    </div>
  );
}

function Section({ icon, label, badge, children }: { icon: React.ReactNode; label: string; badge?: string; children: React.ReactNode }) {
  return (
    <div className="mb-4 pb-3 border-b border-border last-of-type:border-b-0 last-of-type:mb-2">
      <label className="flex items-center gap-1 text-xs font-semibold text-text-2 uppercase tracking-wider mb-2">
        {icon}
        {label}
        {badge && <span className="text-xs font-normal text-muted-foreground normal-case tracking-normal bg-input px-1.5 py-px rounded">{badge}</span>}
      </label>
      {children}
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 pr-7 border border-border rounded-sm bg-background text-foreground text-sm outline-none cursor-pointer appearance-none bg-[url('data:image/svg+xml,%3Csvg%20width=%2710%27%20height=%276%27%20viewBox=%270%200%2010%206%27%20fill=%27none%27%20xmlns=%27http://www.w3.org/2000/svg%27%3E%3Cpath%20d=%27M1%201L5%205L9%201%27%20stroke=%27%2394a3b8%27%20stroke-width=%271.5%27%20stroke-linecap=%27round%27/%3E%3C/svg%3E')] bg-no-repeat bg-[right_10px_center] focus:border-accent"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </div>
  );
}

function RadioGroup({ name, value, onChange, options }: { name: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="flex gap-1 bg-input rounded-sm p-1 border border-border">
      {options.map((o) => (
        <label key={o.value} className="flex-1 text-center cursor-pointer">
          <input type="radio" name={name} value={o.value} checked={value === o.value} onChange={() => onChange(o.value)} className="hidden" />
          <span className={`block py-1 px-2 rounded text-xs font-medium cursor-pointer transition-all ${value === o.value ? "bg-background text-accent shadow-sm" : "text-text-2 hover:text-foreground"}`}>
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

function RadioField({ label, name, value, onChange, options, suffix = "" }: { label: string; name: string; value: number; onChange: (v: number) => void; options: number[]; suffix?: string }) {
  return (
    <div className="flex items-center gap-2 mb-2">
      <span className="text-xs font-medium text-muted-foreground min-w-16 shrink-0">{label}</span>
      <div className="flex flex-1 gap-1 bg-input rounded-sm p-1 border border-border">
        {options.map((o) => (
          <label key={o} className="flex-1 text-center cursor-pointer">
            <input type="radio" name={name} value={o} checked={value === o} onChange={() => onChange(o)} className="hidden" />
            <span className={`block py-1 px-2 rounded text-xs font-medium cursor-pointer transition-all ${value === o ? "bg-background text-accent shadow-sm" : "text-text-2 hover:text-foreground"}`}>
              {o}{suffix}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function KeyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  );
}

function GlobeIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

function MicIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    </svg>
  );
}

function MonitorIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
      <line x1="8" y1="21" x2="16" y2="21" />
      <line x1="12" y1="17" x2="12" y2="21" />
    </svg>
  );
}

function DocIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}
