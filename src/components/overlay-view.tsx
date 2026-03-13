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
  provisionalSpeaker: number | null;
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
  provisionalSpeaker,
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
    <div
      className="flex h-full w-full flex-col rounded-2xl border border-border bg-background shadow-lg overflow-hidden animate-[fade-in-up_250ms_ease-out]"
      style={{ opacity }}
    >
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
        provisionalSpeaker={provisionalSpeaker}
        fontSize={fontSize}
        isListening={isRunning && segments.length === 0 && !provisionalText}
      />

      <div className="h-1.5 cursor-ns-resize bg-transparent flex items-center justify-center shrink-0 [-webkit-app-region:no-drag]">
        <div className="w-9 h-0.5 rounded-sm bg-border transition-colors hover:bg-muted-foreground" />
      </div>
    </div>
  );
}
