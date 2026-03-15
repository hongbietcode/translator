import type { SonioxStatus } from "@/lib/soniox-websocket-client";
import type { TranscriptSegment } from "@/hooks/use-soniox";
import type { AiMessage } from "@/hooks/use-ai-service";
import { Titlebar } from "./titlebar";
import { TranscriptDisplay } from "./transcript-display";
import { AiAssistantPanel } from "./ai-assistant-panel";

interface OverlayViewProps {
  status: SonioxStatus;
  isRunning: boolean;
  currentSource: string;
  currentDevice: string | null;
  segments: TranscriptSegment[];
  provisionalText: string;
  fontSize: number;
  opacity: number;
  showOriginal: boolean;
  backgroundColor: string;
  textColor: string;
  aiEnabled: boolean;
  subtitleMode: boolean;
  aiMessages: AiMessage[];
  aiStreaming: boolean;
  aiConfigured: boolean;
  onToggle: () => void;
  onSourceChange: (source: string, device: string | null) => void;
  onClear: () => void;
  onToggleAi: () => void;
  onToggleSubtitle: () => void;
  onMinimize: () => void;
  onClose: () => void;
  onAskAi: (segmentIndex: number) => void;
  onAiSend: (question: string) => void;
  onAiStop: () => void;
  onAiClear: () => void;
}

export function OverlayView({
  status,
  isRunning,
  currentSource,
  currentDevice,
  segments,
  provisionalText,
  fontSize,
  opacity,
  showOriginal,
  backgroundColor,
  textColor,
  aiEnabled,
  aiMessages,
  aiStreaming,
  aiConfigured,
  onToggle,
  onSourceChange,
  onClear,
  onToggleAi,
  onToggleSubtitle,
  subtitleMode,
  onMinimize,
  onClose,
  onAskAi,
  onAiSend,
  onAiStop,
  onAiClear,
}: OverlayViewProps) {
  return (
    <div className="view-shell" style={{ opacity, backgroundColor, color: textColor }}>
      <Titlebar
        status={status}
        isRunning={isRunning}
        currentSource={currentSource}
        currentDevice={currentDevice}
        aiEnabled={aiEnabled}
        subtitleMode={subtitleMode}
        onToggle={onToggle}
        onSourceChange={onSourceChange}
        onClear={onClear}
        onToggleAi={onToggleAi}
        onToggleSubtitle={onToggleSubtitle}
        onMinimize={onMinimize}
        onClose={onClose}
      />

      <div className={`overlay-content ${aiEnabled ? "overlay-content--split" : ""}`}>
        <TranscriptDisplay
          segments={segments}
          provisionalText={provisionalText}
          fontSize={fontSize}
          showOriginal={showOriginal}
          isListening={isRunning && segments.length === 0 && !provisionalText}
          aiEnabled={aiEnabled}
          onAskAi={onAskAi}
        />

        {aiEnabled && (
          <AiAssistantPanel
            messages={aiMessages}
            isStreaming={aiStreaming}
            isConfigured={aiConfigured}
            onSend={onAiSend}
            onStop={onAiStop}
            onClear={onAiClear}
          />
        )}
      </div>

    </div>
  );
}
