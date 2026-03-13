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
  onToggle: () => void;
  onSourceChange: (source: string, device: string | null) => void;
  onSettings: () => void;
  onHistory: () => void;
  onClear: () => void;
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
  onToggle,
  onSourceChange,
  onSettings,
  onHistory,
  onClear,
  onClose,
}: OverlayViewProps) {
  return (
    <div className="view-shell" style={{ opacity }}>
      <Titlebar
        status={status}
        isRunning={isRunning}
        currentSource={currentSource}
        currentDevice={currentDevice}
        onToggle={onToggle}
        onSourceChange={onSourceChange}
        onSettings={onSettings}
        onHistory={onHistory}
        onClear={onClear}
        onClose={onClose}
      />

      <TranscriptDisplay
        segments={segments}
        provisionalText={provisionalText}
        fontSize={fontSize}
        isListening={isRunning && segments.length === 0 && !provisionalText}
      />

      <div className="overlay-resize">
        <div className="overlay-resize-bar" />
      </div>
    </div>
  );
}
