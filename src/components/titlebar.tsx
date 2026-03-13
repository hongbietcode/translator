import type { SonioxStatus } from "@/lib/soniox-websocket-client";
import { SourceSelector } from "./source-selector";

interface TitlebarProps {
  status: SonioxStatus;
  isRunning: boolean;
  currentSource: string;
  currentDevice: string | null;
  onToggle: () => void;
  onSourceChange: (source: string, device: string | null) => void;
  onSettings: () => void;
  onHistory: () => void;
  onClear: () => void;
  onClose: () => void;
}

const STATUS_CONFIG: Record<SonioxStatus, { dotClass: string; label: string }> = {
  disconnected: { dotClass: "status-dot status-dot--disconnected", label: "Ready" },
  connecting: { dotClass: "status-dot status-dot--connecting", label: "Connecting..." },
  connected: { dotClass: "status-dot status-dot--connected", label: "Listening" },
  error: { dotClass: "status-dot status-dot--error", label: "Error" },
};

export function Titlebar({
  status,
  isRunning,
  currentSource,
  currentDevice,
  onToggle,
  onSourceChange,
  onSettings,
  onHistory,
  onClear,
  onClose,
}: TitlebarProps) {
  const statusCfg = STATUS_CONFIG[status];

  return (
    <div className="titlebar" data-tauri-drag-region>
      <div className="titlebar-status" data-tauri-drag-region>
        <span className={statusCfg.dotClass} />
        <span className="status-label">{statusCfg.label}</span>
      </div>

      <div className="titlebar-spacer" data-tauri-drag-region />

      <div className="titlebar-actions">
        <SourceSelector
          currentSource={currentSource}
          currentDevice={currentDevice}
          onSelect={onSourceChange}
        />

        <button
          onClick={onToggle}
          className={`btn-toggle ${isRunning ? "btn-toggle--stop" : "btn-toggle--start"}`}
        >
          {isRunning ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <rect x="4" y="4" width="16" height="16" rx="2" />
            </svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          )}
          <span>{isRunning ? "Stop" : "Start"}</span>
        </button>

        <div className="titlebar-divider" />

        <IconButton title="History (⌘H)" onClick={onHistory}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </IconButton>

        <IconButton title="Settings (⌘,)" onClick={onSettings}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </IconButton>

        <IconButton title="Clear" onClick={onClear}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            <path d="M10 11v6" />
            <path d="M14 11v6" />
          </svg>
        </IconButton>

        <IconButton title="Close" onClick={onClose} className="icon-btn--close">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </IconButton>
      </div>
    </div>
  );
}

function IconButton({
  children,
  title,
  onClick,
  className = "",
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  className?: string;
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      className={`icon-btn ${className}`}
    >
      {children}
    </button>
  );
}
