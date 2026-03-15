import type { SonioxStatus } from "@/lib/soniox-websocket-client";
import { SourceSelector } from "./source-selector";

interface TitlebarProps {
  status: SonioxStatus;
  isRunning: boolean;
  currentSource: string;
  currentDevice: string | null;
  aiEnabled: boolean;
  onToggle: () => void;
  onSourceChange: (source: string, device: string | null) => void;
  onClear: () => void;
  onToggleAi: () => void;
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
  aiEnabled,
  onToggle,
  onSourceChange,
  onClear,
  onToggleAi,
}: TitlebarProps) {
  const statusCfg = STATUS_CONFIG[status];

  return (
    <div className="toolbar">
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
          onClick={onToggleAi}
          className={`pill-segment pill-icon ${aiEnabled ? "pill-icon--active" : ""}`}
          title="AI Assistant"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
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
      </div>
    </div>
  );
}
