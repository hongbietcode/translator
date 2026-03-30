import { getCurrentWindow } from "@tauri-apps/api/window";
import type { VoiceInputState } from "@/hooks/use-voice-input-state-machine";

interface VoiceInputOverlayProps {
  state: VoiceInputState;
  onEnd: () => void;
  onCancel: () => void;
}

const STATE_LABELS: Record<string, string> = {
  idle: "READY",
  listening: "LISTENING",
  finalizing: "PROCESSING",
  correcting: "CORRECTING",
  inserting: "INSERTING",
  done: "DONE",
  error: "ERROR",
};

export function VoiceInputOverlay({ state, onEnd, onCancel }: VoiceInputOverlayProps) {
  const phase = state.phase;

  const finalText =
    phase === "listening"
      ? state.transcript
      : phase === "done"
        ? state.text.length > 60 ? state.text.slice(0, 60) + "..." : state.text
        : phase === "error"
          ? state.message
          : phase === "correcting" || phase === "finalizing"
            ? state.transcript
            : phase === "inserting"
              ? state.text
              : "";

  const interimText = phase === "listening" ? state.provisional : "";
  const showPrompt = phase === "listening" && !state.transcript && !state.provisional;

  return (
    <div
      className="vi-shell"
      data-state={phase}
      onMouseDown={(e) => {
        if ((e.target as HTMLElement).closest("button")) return;
        getCurrentWindow().startDragging();
      }}
    >
      <span className="vi-status-dot" />

      <div className="vi-transcript">
        {showPrompt ? (
          <span className="vi-transcript-prompt">Listening...</span>
        ) : (
          <>
            <span className="vi-transcript-final">{finalText}</span>
            {interimText && <span className="vi-transcript-interim">{interimText}</span>}
          </>
        )}
      </div>

      <span className="vi-state-label">{STATE_LABELS[phase]}</span>

      <div className="vi-sep" />

      <div className="vi-actions">
        {phase === "listening" && (
          <button className="vi-btn" onClick={onEnd} title="End & Insert (Enter)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </button>
        )}
        <button className="vi-btn" onClick={onCancel} title="Cancel (Esc)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
