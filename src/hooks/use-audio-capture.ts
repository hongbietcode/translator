import { useState, useCallback, useRef } from "react";
import { invoke, Channel } from "@tauri-apps/api/core";

export function useAudioCapture() {
  const [isCapturing, setIsCapturing] = useState(false);
  const onAudioDataRef = useRef<((pcm: Uint8Array) => void) | null>(null);

  const startCapture = useCallback(
    async (source: string, device: string | null = null) => {
      const channel = new Channel<number[]>();
      channel.onmessage = (pcmData) => {
        const bytes = new Uint8Array(pcmData);
        onAudioDataRef.current?.(bytes);
      };

      await invoke("start_capture", { source, device, channel });
      setIsCapturing(true);
    },
    [],
  );

  const stopCapture = useCallback(async () => {
    try {
      await invoke("stop_capture");
    } catch (err) {
      console.error("Failed to stop capture:", err);
    }
    setIsCapturing(false);
  }, []);

  const setOnAudioData = useCallback((cb: (pcm: Uint8Array) => void) => {
    onAudioDataRef.current = cb;
  }, []);

  return { isCapturing, startCapture, stopCapture, setOnAudioData };
}
