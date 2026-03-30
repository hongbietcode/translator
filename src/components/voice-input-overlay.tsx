import { getCurrentWindow } from "@tauri-apps/api/window";
import type { VoiceInputState } from "@/hooks/use-voice-input-state-machine";

interface VoiceInputOverlayProps {
  state: VoiceInputState;
  onEnd: () => void;
  onCancel: () => void;
}

export function VoiceInputOverlay({
  state,
  onEnd,
  onCancel,
}: VoiceInputOverlayProps) {
  const phase = state.phase;
  const titleMap: Record<string, string> = {
    idle: "Ready",
    listening: "Listening...",
    finalizing: "Processing...",
    correcting: "Correcting...",
    inserting: "Inserting...",
    done: "Done",
    error: "Error",
  };

  const liveText =
    phase === "listening"
      ? (state.transcript + (state.provisional ? " " + state.provisional : "")).trim()
      : "";

  return (
    <div
      className="vi-shell"
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("button, .vi-text")) return;
        getCurrentWindow().startDragging();
      }}
    >
      <div className="vi-header">
        <div className="vi-header-left">
          {phase === "listening" && <span className="vi-rec-dot" />}
          {(phase === "finalizing" || phase === "correcting" || phase === "inserting") && (
            <span className="vi-spinner" />
          )}
          {phase === "done" && (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          )}
          <span className="vi-title">{titleMap[phase]}</span>
        </div>
        <button className="vi-close" onClick={onCancel} title="Cancel (Esc)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="vi-body">
        {phase === "listening" && (
          <>
            <div className="vi-text">{liveText || "Speak now..."}</div>
            <div className="vi-actions">
              <button className="vi-btn vi-btn--primary" onClick={onEnd}>
                End & Insert
              </button>
            </div>
          </>
        )}

        {(phase === "finalizing" || phase === "correcting" || phase === "inserting") && (
          <div className="vi-text vi-text--muted">
            {phase === "correcting" && "Correcting transcript..."}
            {phase === "inserting" && "Inserting text..."}
            {phase === "finalizing" && "Finalizing..."}
          </div>
        )}

        {phase === "done" && (
          <div className="vi-text vi-text--result">
            {state.text.length > 80 ? state.text.slice(0, 80) + "..." : state.text}
          </div>
        )}

        {phase === "error" && (
          <>
            <div className="vi-text vi-text--error">{state.message}</div>
            <div className="vi-actions">
              <button className="vi-btn" onClick={onCancel}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
