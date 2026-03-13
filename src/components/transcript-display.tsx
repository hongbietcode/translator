import { useEffect, useRef } from "react";
import type { TranscriptSegment } from "@/hooks/use-soniox";

interface TranscriptDisplayProps {
  segments: TranscriptSegment[];
  provisionalText: string;
  provisionalSpeaker: number | null;
  fontSize: number;
  isListening: boolean;
}

export function TranscriptDisplay({
  segments,
  provisionalText,
  provisionalSpeaker,
  fontSize,
  isListening,
}: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const hasContent = segments.length > 0 || provisionalText;

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [segments, provisionalText]);

  if (!hasContent && !isListening) {
    return (
      <div className="transcript-empty">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        <p>Press Start to begin translating</p>
        <span className="transcript-shortcut">⌘ Enter</span>
      </div>
    );
  }

  if (!hasContent && isListening) {
    return (
      <div className="transcript-listening">
        <div className="wave-bars">
          {[0, 0.12, 0.24, 0.36, 0.48].map((delay, i) => (
            <span
              key={i}
              className="wave-bar"
              style={{ animation: `wave 1s cubic-bezier(0.4, 0, 0.2, 1) infinite`, animationDelay: `${delay}s` }}
            />
          ))}
        </div>
        <p className="listening-label">Listening...</p>
      </div>
    );
  }

  let lastRenderedSpeaker: number | null = null;

  return (
    <div ref={scrollRef} className="transcript-scroll">
      <div className="transcript-body" style={{ fontSize: `${fontSize}px` }}>
        {segments.map((seg, i) => {
          const nodes: React.ReactNode[] = [];

          if (seg.speaker && seg.speaker !== lastRenderedSpeaker) {
            nodes.push(
              <span key={`spk-${i}`} className="speaker-label">
                Speaker {seg.speaker}:
              </span>,
            );
            lastRenderedSpeaker = seg.speaker;
          }

          if (seg.status === "translated" && seg.translation) {
            nodes.push(
              <span key={`txt-${i}`} className="text-translated">
                {seg.translation}
              </span>,
            );
          }

          return nodes;
        })}

        {provisionalText && (
          <>
            {provisionalSpeaker && provisionalSpeaker !== lastRenderedSpeaker && (
              <span className="speaker-label">
                Speaker {provisionalSpeaker}:
              </span>
            )}
            <span className="text-provisional">{provisionalText}</span>
          </>
        )}

        {(segments.length > 0 || provisionalText) && (
          <span className="cursor-blink">▎</span>
        )}
      </div>
    </div>
  );
}
