import { useCallback, useEffect, useRef, useState } from "react";
import type { AiMessage } from "@/hooks/use-ai-service";

interface AiAssistantPanelProps {
  messages: AiMessage[];
  isStreaming: boolean;
  isConfigured: boolean;
  onSend: (question: string) => void;
  onStop: () => void;
  onClear: () => void;
}

export function AiAssistantPanel({
  messages,
  isStreaming,
  isConfigured,
  onSend,
  onStop,
  onClear,
}: AiAssistantPanelProps) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSubmit = useCallback(() => {
    const q = input.trim();
    if (!q || isStreaming) return;
    setInput("");
    onSend(q);
  }, [input, isStreaming, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit],
  );

  if (!isConfigured) {
    return (
      <div className="ai-panel">
        <div className="ai-panel-empty">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.35">
            <path d="M12 2l2.4 7.2L22 12l-7.6 2.8L12 22l-2.4-7.2L2 12l7.6-2.8z" />
          </svg>
          <p>AI service not connected</p>
          <span className="ai-panel-hint">Add your Anthropic API key in Settings and start the ai-service</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-panel">
      <div className="ai-panel-header">
        <span className="ai-panel-title">AI Assistant</span>
        <button className="ai-panel-clear" onClick={onClear} title="Clear chat">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="3 6 5 6 21 6" />
            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          </svg>
        </button>
      </div>

      <div ref={scrollRef} className="ai-panel-messages">
        {messages.length === 0 && (
          <div className="ai-panel-empty">
            <p>Click "Ask AI" on any transcript segment or type a question below</p>
          </div>
        )}
        {messages.map((msg, i) => (
          <div key={i} className={`ai-msg ai-msg--${msg.role}`}>
            <div className="ai-msg-content">{msg.content || (isStreaming && i === messages.length - 1 ? "..." : "")}</div>
          </div>
        ))}
      </div>

      <div className="ai-panel-input">
        <textarea
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask about the conversation..."
          rows={1}
          className="ai-input-field"
        />
        {isStreaming ? (
          <button className="ai-send-btn" onClick={onStop} title="Stop">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="6" width="12" height="12" rx="1" />
            </svg>
          </button>
        ) : (
          <button className="ai-send-btn" onClick={handleSubmit} disabled={!input.trim()} title="Send">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}
