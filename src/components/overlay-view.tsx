import type { SonioxStatus } from "@/lib/soniox-websocket-client";
import type { TranscriptSegment } from "@/hooks/use-soniox";
import { Titlebar } from "./titlebar";
import { TranscriptDisplay } from "./transcript-display";

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
  subtitleMode: boolean;
  onToggle: () => void;
  onSourceChange: (source: string, device: string | null) => void;
  onClear: () => void;
  onToggleSubtitle: () => void;
  onMinimize: () => void;
  onClose: () => void;
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
  onToggle,
  onSourceChange,
  onClear,
  onToggleSubtitle,
  subtitleMode,
  onMinimize,
  onClose,
}: OverlayViewProps) {
  return (
    <div className="view-shell" style={{ opacity, backgroundColor, color: textColor }}>
      <Titlebar
        status={status}
        isRunning={isRunning}
        currentSource={currentSource}
        currentDevice={currentDevice}
        subtitleMode={subtitleMode}
        onToggle={onToggle}
        onSourceChange={onSourceChange}
        onClear={onClear}
        onToggleSubtitle={onToggleSubtitle}
        onMinimize={onMinimize}
        onClose={onClose}
      />

      <div className="overlay-content">
        <TranscriptDisplay
          segments={segments}
          provisionalText={provisionalText}
          fontSize={fontSize}
          showOriginal={showOriginal}
          isListening={isRunning && segments.length === 0 && !provisionalText}
        />
      </div>
    </div>
  );
}
