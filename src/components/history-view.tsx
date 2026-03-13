import { useState } from "react";
import type { HistorySession } from "@/hooks/use-history";

interface HistoryViewProps {
  sessions: HistorySession[];
  onBack: () => void;
  onExportSession: (sessionId: number) => void;
  onClear: () => void;
}

function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function HistoryView({ sessions, onBack, onExportSession, onClear }: HistoryViewProps) {
  const [expandedId, setExpandedId] = useState<number | null>(null);

  return (
    <div className="view-shell">
      <div className="view-header" data-tauri-drag-region>
        <button onClick={onBack} className="back-btn">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h2 className="view-header-title">History</h2>
        <div className="view-header-spacer" />
      </div>

      <div className="history-list">
        {sessions.length === 0 ? (
          <div className="history-empty">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p>No history yet</p>
            <span>Sessions will appear here after you start translating</span>
          </div>
        ) : (
          sessions.map((s) => {
            const time = new Date(s.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const date = new Date(s.startedAt).toLocaleDateString([], { month: "short", day: "numeric" });
            const isOpen = expandedId === s.id;

            return (
              <div key={s.id} className={`h-session ${isOpen ? "h-session--open" : ""}`}>
                <div
                  className="h-session-top"
                  onClick={() => setExpandedId(isOpen ? null : s.id)}
                >
                  <div className="h-session-info">
                    <span className="h-session-title">{s.title}</span>
                    <div className="h-session-meta">
                      <span>{date} · {time}</span>
                      <span className="h-lang-badge">{s.sourceLang} → {s.targetLang}</span>
                      <span>{s.entries.length} msg</span>
                    </div>
                  </div>
                  <button
                    className="h-export-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      onExportSession(s.id);
                    }}
                    title="Copy to clipboard"
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                    </svg>
                  </button>
                </div>

                {isOpen && (
                  <div className="h-conversation">
                    {s.entries.map((e, i) => (
                      <div
                        key={i}
                        className="h-message"
                        dangerouslySetInnerHTML={{ __html: escapeHtml(e.translation) }}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {sessions.length > 0 && (
        <div className="history-footer">
          <button onClick={onClear} className="btn-clear-history">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
            </svg>
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
