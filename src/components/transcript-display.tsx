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
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-muted-foreground">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35">
          <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" y1="19" x2="12" y2="23" />
          <line x1="8" y1="23" x2="16" y2="23" />
        </svg>
        <p className="text-sm">Press Start to begin translating</p>
        <span className="text-xs text-muted-foreground bg-input px-2 py-0.5 rounded border border-border font-mono opacity-70">
          ⌘ Enter
        </span>
      </div>
    );
  }

  if (!hasContent && isListening) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground animate-[fade-in-up_0.3s_ease]">
        <div className="flex items-center gap-1 h-8">
          {[0, 0.15, 0.3, 0.45, 0.6].map((delay, i) => (
            <span
              key={i}
              className="block w-0.5 h-2 bg-accent rounded-sm"
              style={{ animation: `wave 1.2s ease-in-out infinite`, animationDelay: `${delay}s` }}
            />
          ))}
        </div>
        <p className="text-xs font-medium tracking-wider">Listening...</p>
      </div>
    );
  }

  let lastRenderedSpeaker: number | null = null;

  return (
    <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden px-4 py-3">
      <div className="leading-[1.7] break-words" style={{ fontSize: `${fontSize}px` }}>
        {segments.map((seg, i) => {
          const nodes: React.ReactNode[] = [];

          if (seg.speaker && seg.speaker !== lastRenderedSpeaker) {
            nodes.push(
              <span key={`spk-${i}`} className="block text-warning font-semibold text-[0.85em] tracking-wide mt-3 mb-0.5">
                Speaker {seg.speaker}:
              </span>,
            );
            lastRenderedSpeaker = seg.speaker;
          }

          if (seg.status === "translated" && seg.translation) {
            nodes.push(
              <span key={`txt-${i}`} className="text-foreground">
                {seg.translation}
              </span>,
            );
          }

          return nodes;
        })}

        {provisionalText && (
          <>
            {provisionalSpeaker && provisionalSpeaker !== lastRenderedSpeaker && (
              <span className="block text-warning font-semibold text-[0.85em] tracking-wide mt-3 mb-0.5">
                Speaker {provisionalSpeaker}:
              </span>
            )}
            <span className="text-muted-foreground italic">{provisionalText}</span>
          </>
        )}

        {(segments.length > 0 || provisionalText) && (
          <span className="text-accent font-light animate-[blink_1s_step-end_infinite]">▎</span>
        )}
      </div>
    </div>
  );
}
