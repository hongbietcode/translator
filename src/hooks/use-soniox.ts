import { useRef, useState, useCallback, useEffect } from "react";
import {
  SonioxWebSocketClient,
  type SonioxConfig,
  type SonioxStatus,
} from "@/lib/soniox-websocket-client";

export interface TranscriptSegment {
  original: string;
  translation: string | null;
  status: "original" | "translated";
  speaker: number | null;
  createdAt: number;
}

export function useSoniox() {
  const clientRef = useRef<SonioxWebSocketClient | null>(null);
  const [status, setStatus] = useState<SonioxStatus>("disconnected");
  const [segments, setSegments] = useState<TranscriptSegment[]>([]);
  const [provisionalText, setProvisionalText] = useState("");
  const [provisionalSpeaker, setProvisionalSpeaker] = useState<number | null>(null);
  const onTranslationRef = useRef<((text: string) => void) | null>(null);
  const onErrorRef = useRef<((error: string) => void) | null>(null);

  useEffect(() => {
    const client = new SonioxWebSocketClient();
    clientRef.current = client;

    client.onStatusChange = (s) => setStatus(s);

    client.onOriginal = (text, speaker) => {
      setSegments((prev) => {
        const next = [
          ...prev,
          {
            original: text,
            translation: null,
            status: "original" as const,
            speaker,
            createdAt: Date.now(),
          },
        ];
        return cleanupSegments(next);
      });
    };

    client.onTranslation = (text) => {
      setSegments((prev) => {
        const idx = prev.findIndex((s) => s.status === "original");
        if (idx >= 0) {
          const updated = [...prev];
          updated[idx] = { ...updated[idx], translation: text, status: "translated" };
          return updated;
        }
        return [
          ...prev,
          {
            original: "",
            translation: text,
            status: "translated" as const,
            speaker: null,
            createdAt: Date.now(),
          },
        ];
      });
      onTranslationRef.current?.(text);
    };

    client.onProvisional = (text, speaker) => {
      setProvisionalText(text);
      setProvisionalSpeaker(speaker);
    };

    client.onError = (err) => {
      onErrorRef.current?.(err);
    };

    return () => {
      client.disconnect();
    };
  }, []);

  const connect = useCallback((config: SonioxConfig) => {
    clientRef.current?.connect(config);
  }, []);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  const sendAudio = useCallback((pcm: ArrayBuffer) => {
    clientRef.current?.sendAudio(pcm);
  }, []);

  const clearSegments = useCallback(() => {
    setSegments([]);
    setProvisionalText("");
    setProvisionalSpeaker(null);
  }, []);

  return {
    status,
    segments,
    provisionalText,
    provisionalSpeaker,
    connect,
    disconnect,
    sendAudio,
    clearSegments,
    onTranslationRef,
    onErrorRef,
  };
}

function cleanupSegments(segments: TranscriptSegment[]): TranscriptSegment[] {
  const now = Date.now();
  const STALE_MS = 10000;
  const MAX_PENDING = 3;
  const MAX_CHARS = 1200;

  let filtered = segments.filter(
    (s) => !(s.status === "original" && now - s.createdAt > STALE_MS),
  );

  let pending = filtered.filter((s) => s.status === "original");
  while (pending.length > MAX_PENDING) {
    const oldest = pending.shift()!;
    filtered = filtered.filter((s) => s !== oldest);
    pending = filtered.filter((s) => s.status === "original");
  }

  let totalLen = filtered.reduce(
    (sum, s) => sum + (s.translation || s.original || "").length,
    0,
  );
  while (totalLen > MAX_CHARS && filtered.length > 2) {
    const removed = filtered.shift()!;
    totalLen -= (removed.translation || removed.original || "").length;
  }

  return filtered;
}
