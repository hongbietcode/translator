import { useState, useCallback, useRef } from "react";

interface HistoryEntry {
  translation: string;
  ts: number;
}

export interface HistorySession {
  id: number;
  startedAt: Date;
  source: string;
  sourceLang: string;
  targetLang: string;
  entries: HistoryEntry[];
}

export function useHistory() {
  const [sessions, setSessions] = useState<HistorySession[]>([]);
  const currentRef = useRef<HistorySession | null>(null);

  const startSession = useCallback(
    (source: string, sourceLang: string, targetLang: string) => {
      currentRef.current = {
        id: Date.now(),
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

  const exportText = useCallback(() => {
    if (sessions.length === 0) return "";
    return sessions
      .map((s) => {
        const date = new Date(s.startedAt).toLocaleString();
        const lang = `${s.sourceLang} → ${s.targetLang}`;
        const lines = s.entries.map((e) => e.translation).join("\n");
        return `=== ${date} [${lang}] (${s.source}) ===\n${lines}`;
      })
      .join("\n\n");
  }, [sessions]);

  return { sessions, startSession, addEntry, endSession, clear, exportText };
}
