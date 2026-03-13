import { useCallback, useEffect, useRef, useState } from "react";
import type { TranscriptSegment } from "@/hooks/use-soniox";

const SETTLE_MS = 600;
const WORD_STAGGER_MS = 30;
const BOTTOM_THRESHOLD = 30;

interface TranscriptDisplayProps {
  segments: TranscriptSegment[];
  provisionalText: string;
  fontSize: number;
  isListening: boolean;
}

export function TranscriptDisplay({
  segments,
  provisionalText,
  fontSize,
  isListening,
}: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [settledIds, setSettledIds] = useState<Set<number>>(new Set());
  const [isAtBottom, setIsAtBottom] = useState(true);
  const userScrolledRef = useRef(false);
  const hasContent = segments.length > 0 || provisionalText;

  const checkAtBottom = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD;
  }, []);

  const scrollToBottom = useCallback(() => {
    if (!scrollRef.current) return;
    userScrolledRef.current = false;
    scrollRef.current.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
    setIsAtBottom(true);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const atBottom = checkAtBottom();
      setIsAtBottom(atBottom);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [checkAtBottom, hasContent]);

  useEffect(() => {
    if (isAtBottom && scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [segments, isAtBottom]);

  useEffect(() => {
    const newIds = segments
      .filter((s) => s.status === "translated" && !settledIds.has(s.createdAt))
      .map((s) => s.createdAt);

    if (newIds.length === 0) return;

    const timer = setTimeout(() => {
      setSettledIds((prev) => {
        const next = new Set(prev);
        newIds.forEach((id) => next.add(id));
        return next;
      });
    }, SETTLE_MS);

    return () => clearTimeout(timer);
  }, [segments, settledIds]);

  let lastRenderedSpeaker: number | null = null;

  const renderContent = () => {
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
              const isSettled = settledIds.has(seg.createdAt);

              if (isSettled) {
                nodes.push(
                  <span key={`txt-${i}`} className="text-translated">
                    {seg.translation}
                  </span>,
                );
              } else {
                const words = seg.translation.split(/(\s+)/);
                nodes.push(
                  <span key={`txt-${i}`} className="text-translated">
                    {words.map((word, wi) =>
                      /^\s+$/.test(word) ? (
                        word
                      ) : (
                        <span
                          key={wi}
                          className="word-token"
                          style={{ animationDelay: `${wi * WORD_STAGGER_MS}ms` }}
                        >
                          {word}
                        </span>
                      ),
                    )}
                  </span>,
                );
              }
            }

            return nodes;
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="transcript-wrapper">
      {renderContent()}

      {!isAtBottom && hasContent && (
        <button className="scroll-to-bottom" onClick={scrollToBottom}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>
      )}

      <div className="provisional-bar" style={{ fontSize: `${fontSize}px` }}>
        {provisionalText || isListening ? (
          <>
            <div className="provisional-indicator" />
            <span className="provisional-text">
              {provisionalText || "Listening..."}
            </span>
            <span className="cursor-blink">▎</span>
          </>
        ) : (
          <span className="provisional-text provisional-text--idle">Ready</span>
        )}
      </div>
    </div>
  );
}
