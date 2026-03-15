import { getCurrentWindow } from "@tauri-apps/api/window";

interface VoiceInputOverlayProps {
  state: "recording" | "translating" | "result" | "error";
  liveText: string;
  translatedText: string;
  errorMsg: string;
  onEnd: () => void;
  onCopyAndClose: () => void;
  onCancel: () => void;
}

export function VoiceInputOverlay({
  state,
  liveText,
  translatedText,
  errorMsg,
  onEnd,
  onCopyAndClose,
  onCancel,
}: VoiceInputOverlayProps) {
  return (
    <div className="vi-shell" onMouseDown={(e) => {
      if ((e.target as HTMLElement).closest("button, .vi-text")) return;
      getCurrentWindow().startDragging();
    }}>
      <div className="vi-header">
        <div className="vi-header-left">
          {state === "recording" && <span className="vi-rec-dot" />}
          <span className="vi-title">
            {state === "recording" && "Listening..."}
            {state === "translating" && "Translating..."}
            {state === "result" && "Translation"}
            {state === "error" && "Error"}
          </span>
        </div>
        <button className="vi-close" onClick={onCancel} title="Cancel (Esc)">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="vi-body">
        {state === "recording" && (
          <>
            <div className="vi-text">{liveText || "Speak now..."}</div>
            <div className="vi-actions">
              <button className="vi-btn vi-btn--primary" onClick={onEnd}>
                End & Translate
              </button>
            </div>
          </>
        )}

        {state === "translating" && (
          <>
            <div className="vi-text">{translatedText || "..."}</div>
            <div className="vi-actions">
              <span className="vi-spinner" />
            </div>
          </>
        )}

        {state === "result" && (
          <>
            <div className="vi-text vi-text--result">{translatedText}</div>
            <div className="vi-actions">
              <button className="vi-btn vi-btn--primary" onClick={onCopyAndClose}>
                Copy & Close
              </button>
            </div>
          </>
        )}

        {state === "error" && (
          <>
            <div className="vi-text vi-text--error">{errorMsg}</div>
            <div className="vi-actions">
              <button className="vi-btn" onClick={onCancel}>Close</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
