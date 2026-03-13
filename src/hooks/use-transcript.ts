import { useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useTranscript() {
  const appendTranscript = useCallback(async (text: string) => {
    try {
      await invoke("append_transcript", { text });
    } catch (err) {
      console.error("Failed to save transcript:", err);
    }
  }, []);

  const getTranscriptPath = useCallback(async (): Promise<string> => {
    return invoke<string>("get_transcript_path");
  }, []);

  return { appendTranscript, getTranscriptPath };
}
