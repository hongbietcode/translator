import { useCallback, useEffect, useRef, useState } from "react";
import type { TranscriptSegment } from "@/hooks/use-soniox";

const SPEAKER_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#f59e0b", "#10b981", "#ef4444"];
function speakerColor(id: number) { return SPEAKER_COLORS[(id - 1) % SPEAKER_COLORS.length]; }

interface SpeakerBlock {
  speaker: number;
  segments: (TranscriptSegment & { _index: number })[];
}

function buildSpeakerBlocks(segments: TranscriptSegment[]): SpeakerBlock[] {
  const blocks: SpeakerBlock[] = [];
  let current: SpeakerBlock | null = null;

  segments.forEach((seg, i) => {
    if (seg.status !== "translated" || !seg.translation) return;
    const speaker = seg.speaker ?? 0;

    if (!current || current.speaker !== speaker) {
      current = { speaker, segments: [] };
      blocks.push(current);
    }
    current.segments.push({ ...seg, _index: i });
  });

  return blocks;
}

const SETTLE_MS = 600;
const WORD_STAGGER_MS = 30;
const BOTTOM_THRESHOLD = 30;

interface TranscriptDisplayProps {
  segments: TranscriptSegment[];
  provisionalText: string;
  fontSize: number;
  showOriginal: boolean;
  isListening: boolean;
  aiEnabled?: boolean;
  onAskAi?: (segmentIndex: number) => void;
}

export function TranscriptDisplay({
  segments,
  provisionalText,
  fontSize,
  showOriginal,
  isListening,
  aiEnabled,
  onAskAi,
}: TranscriptDisplayProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [settledIds, setSettledIds] = useState<Set<number>>(
    () => new Set(segments.filter((s) => s.status === "translated").map((s) => s.createdAt)),
  );
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

  const renderContent = () => {
    if (!hasContent && !isListening) {
      return (
        <div className="transcript-empty">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" opacity="0.2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <p>No transcript yet</p>
          <span className="transcript-hint">Click <strong>Start</strong> or press <kbd>⌘ Enter</kbd> to begin</span>
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

    const blocks = buildSpeakerBlocks(segments);

    return (
      <div ref={scrollRef} className="transcript-scroll">
        <div className="transcript-body" style={{ fontSize: `${fontSize}px` }}>
          {blocks.map((block, bi) => {
            const color = speakerColor(block.speaker);
            return (
              <div key={bi} className="transcript-block" style={{ borderLeftColor: color }}>
                {block.speaker > 0 && (
                  <div className="transcript-speaker">
                    <span className="transcript-speaker-dot" style={{ background: color }} />
                    <span className="transcript-speaker-name">Speaker {block.speaker}</span>
                  </div>
                )}
                <div className="transcript-text">
                  {block.segments.map((seg, si) => {
                    if (!seg.translation) return null;
                    const isSettled = settledIds.has(seg.createdAt);
                    const globalIdx = seg._index;

                    return (
                      <span key={si}>
                        {showOriginal && seg.original && (
                          <span className="transcript-original">{seg.original} </span>
                        )}
                        {isSettled ? (
                          seg.translation
                        ) : (
                          seg.translation.split(/(\s+)/).map((word, wi) =>
                            /^\s+$/.test(word) ? word : (
                              <span key={wi} className="word-token" style={{ animationDelay: `${wi * WORD_STAGGER_MS}ms` }}>
                                {word}
                              </span>
                            ),
                          )
                        )}
                        {aiEnabled && onAskAi && (
                          <button className="ask-ai-btn" onClick={() => onAskAi(globalIdx)} title="Ask AI">
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
                            </svg>
                          </button>
                        )}
                        {" "}
                      </span>
                    );
                  })}
                </div>
              </div>
            );
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
