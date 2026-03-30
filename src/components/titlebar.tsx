import type { SonioxStatus } from "@/lib/soniox-websocket-client";
import { SourceSelector } from "./source-selector";

interface TitlebarProps {
  status: SonioxStatus;
  isRunning: boolean;
  currentSource: string;
  currentDevice: string | null;
  subtitleMode: boolean;
  onToggle: () => void;
  onSourceChange: (source: string, device: string | null) => void;
  onClear: () => void;
  onToggleSubtitle: () => void;
  onMinimize: () => void;
  onClose: () => void;
}

const STATUS_CONFIG: Record<SonioxStatus, { dotClass: string; label: string }> = {
  disconnected: { dotClass: "pill-dot pill-dot--disconnected", label: "Ready" },
  connecting: { dotClass: "pill-dot pill-dot--connecting", label: "Connecting" },
  connected: { dotClass: "pill-dot pill-dot--connected", label: "Listening" },
  error: { dotClass: "pill-dot pill-dot--error", label: "Error" },
};

export function Titlebar({
  status,
  isRunning,
  currentSource,
  currentDevice,
  onToggle,
  onSourceChange,
  onClear,
  onToggleSubtitle,
  subtitleMode,
  onMinimize,
  onClose,
}: TitlebarProps) {
  const statusCfg = STATUS_CONFIG[status];

  return (
    <div className="toolbar" data-tauri-drag-region>
      <div className="toolbar-left">
        <span className={statusCfg.dotClass} />
        <span className="pill-label">{statusCfg.label}</span>
      </div>

      <div className="pill-bar">
        <SourceSelector
          currentSource={currentSource}
          currentDevice={currentDevice}
          onSelect={onSourceChange}
        />

        <div className="pill-divider" />

        <button
          onClick={onToggle}
          className={`pill-segment pill-toggle ${isRunning ? "pill-toggle--stop" : "pill-toggle--start"}`}
        >
          {isRunning ? (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          ) : (
            <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
          <span>{isRunning ? "Stop" : "Start"}</span>
        </button>

        <div className="pill-divider" />

        <button
          onClick={onToggleSubtitle}
          className={`pill-segment pill-icon ${subtitleMode ? "pill-icon--active" : ""}`}
          title="Subtitle overlay"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <line x1="6" y1="14" x2="18" y2="14" />
            <line x1="8" y1="18" x2="16" y2="18" />
          </svg>
        </button>

        <div className="pill-divider" />

        <button onClick={onClear} className="pill-segment pill-icon" title="Clear transcript">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M5 6l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12" />
          </svg>
        </button>

        <div className="pill-divider" />

        <button onClick={onMinimize} className="pill-segment pill-icon" title="Minimize">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </button>

        <div className="pill-divider" />

        <button onClick={onClose} className="pill-segment pill-icon pill-icon--close" title="Close window">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
