import { useState, useCallback, useRef } from "react";

interface HistoryEntry {
  original?: string;
  translation: string;
  speaker?: number;
  ts: number;
}

export interface HistorySession {
  id: number;
  title: string;
  startedAt: Date;
  source: string;
  sourceLang: string;
  targetLang: string;
  entries: HistoryEntry[];
}

function generateTitle(entries: HistoryEntry[], sourceLang: string, targetLang: string): string {
  if (entries.length === 0) return "Empty session";
  const preview = entries
    .slice(0, 3)
    .map((e) => e.translation)
    .join(" ")
    .slice(0, 60)
    .trim();
  return preview || `${sourceLang} → ${targetLang}`;
}

export function useHistory() {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const currentRef = useRef<HistorySession | null>(null);

  const startSession = useCallback(
    (source: string, sourceLang: string, targetLang: string) => {
      currentRef.current = {
        id: Date.now(),
        title: "",
        startedAt: new Date(),
        source,
        sourceLang,
        targetLang,
        entries: [],
      };
    },
    [],
  );

  const addEntry = useCallback((translation: string) => {
    if (!currentRef.current || !translation) return;
    currentRef.current.entries.push({ translation, ts: Date.now() });
  }, []);

  const endSession = useCallback(() => {
    const cur = currentRef.current;
    if (cur && cur.entries.length > 0) {
      cur.title = generateTitle(cur.entries, cur.sourceLang, cur.targetLang);
      setSessions((prev) => {
        const next = [{ ...cur, entries: [...cur.entries] }, ...prev];
        return next.slice(0, 30);
      });
    }
    currentRef.current = null;
  }, []);

  const clear = useCallback(() => {
    setSessions([]);
    currentRef.current = null;
  }, []);

  const exportSession = useCallback(
    (sessionId: number): string => {
      const s = sessions.find((s) => s.id === sessionId);
      if (!s) return "";
      const date = new Date(s.startedAt).toLocaleString();
      const lang = `${s.sourceLang} → ${s.targetLang}`;
      const lines = s.entries.map((e) => e.translation).join("\n");
      return `=== ${s.title} ===\n${date} [${lang}] (${s.source})\n\n${lines}`;
    },
    [sessions],
  );

  return { sessions, startSession, addEntry, endSession, clear, exportSession };
}
