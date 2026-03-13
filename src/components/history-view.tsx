import type { HistorySession } from "@/hooks/use-history";

interface HistoryViewProps {
  sessions: HistorySession[];
  onBack: () => void;
  onExport: () => void;
  onClear: () => void;
}

function escapeHtml(str: string) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function HistoryView({ sessions, onBack, onExport, onClear }: HistoryViewProps) {
  return (
    <div className="flex h-full w-full flex-col rounded-2xl border border-border bg-background shadow-lg overflow-hidden animate-[fade-in-up_250ms_ease-out]">
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
        <h2 className="text-sm font-semibold text-foreground">History</h2>
        <button
          onClick={onExport}
          className="flex items-center gap-1 h-7 px-2 border border-border rounded-sm bg-background text-text-2 cursor-pointer text-xs font-medium transition-all hover:border-accent hover:text-accent hover:bg-accent-glow [-webkit-app-region:no-drag]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="7 10 12 15 17 10" />
            <line x1="12" y1="15" x2="12" y2="3" />
          </svg>
          Export
        </button>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {sessions.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-2 text-muted-foreground p-6 text-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.3">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <p className="text-sm font-medium text-text-2">No history yet</p>
            <span className="text-xs leading-relaxed">Sessions will appear here after you start translating</span>
          </div>
        ) : (
          sessions.map((s) => {
            const time = new Date(s.startedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
            const date = new Date(s.startedAt).toLocaleDateString([], { month: "short", day: "numeric" });
            return (
              <div key={s.id} className="border-b border-border last:border-b-0">
                <div className="flex items-center gap-2 px-3 pt-2 pb-1">
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex-1">
                    {date} · {time}
                  </span>
                  <span className="text-xs text-muted-foreground bg-input px-1.5 py-0.5 rounded-full border border-border">
                    {s.sourceLang} → {s.targetLang}
                  </span>
                </div>
                {s.entries.slice(0, 8).map((e, i) => (
                  <div
                    key={i}
                    className="px-3 py-1 text-xs leading-relaxed text-text-2"
                    dangerouslySetInnerHTML={{ __html: escapeHtml(e.translation) }}
                  />
                ))}
                {s.entries.length > 8 && (
                  <div className="px-3 py-1 text-xs text-muted-foreground pb-2">
                    +{s.entries.length - 8} more...
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      <div className="px-3 py-2 border-t border-border bg-muted shrink-0">
        <button
          onClick={onClear}
          className="flex items-center gap-1 h-7 px-3 border border-destructive/25 rounded-sm bg-transparent text-destructive cursor-pointer text-xs font-medium transition-all hover:bg-destructive/5 hover:border-destructive [-webkit-app-region:no-drag]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
          Clear All
        </button>
      </div>
    </div>
  );
}
