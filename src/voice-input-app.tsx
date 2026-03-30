import { useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useSettings } from "@/hooks/use-settings";
import { useAudioCapture } from "@/hooks/use-audio-capture";
import { useSoniox } from "@/hooks/use-soniox";
import { useVoiceInputStateMachine } from "@/hooks/use-voice-input-state-machine";
import { detectStopWord } from "@/lib/stop-word-detection";
import { VoiceInputOverlay } from "@/components/voice-input-overlay";

export function VoiceInputApp() {
  const { settings, isLoading } = useSettings();
  const { startCapture, stopCapture, setOnAudioData } = useAudioCapture();
  const soniox = useSoniox();
  const sm = useVoiceInputStateMachine();
  const accumulatedRef = useRef("");
  const startedRef = useRef(false);
  const handleEndRef = useRef<(text?: string) => Promise<void>>();

  useEffect(() => {
    soniox.onTranslationRef.current = null;
    soniox.onErrorRef.current = (err) => {
      sm.setError(err, true);
    };
  }, [soniox.onTranslationRef, soniox.onErrorRef, sm]);

  useEffect(() => {
    const text = soniox.segments.map((s) => s.original).join(" ");
    if (text) accumulatedRef.current = text;
    const display = (
      accumulatedRef.current +
      (soniox.provisionalText ? " " + soniox.provisionalText : "")
    ).trim();
    sm.updateTranscript(accumulatedRef.current, soniox.provisionalText);

    if (settings.voice_stop_word && text) {
      const { detected, cleanedTranscript } = detectStopWord(
        accumulatedRef.current,
        settings.voice_stop_word,
      );
      if (detected) {
        accumulatedRef.current = cleanedTranscript;
        handleEndRef.current?.(cleanedTranscript);
      }
    }
  }, [soniox.segments, soniox.provisionalText]);

  useEffect(() => {
    if (isLoading || startedRef.current) return;
    startedRef.current = true;

    if (!settings.soniox_api_key) {
      sm.setError("No Soniox API key configured", false);
      return;
    }

    sm.startListening();

    setOnAudioData((pcm: Uint8Array) => {
      soniox.sendAudio(pcm.slice().buffer as ArrayBuffer);
    });

    soniox.connect({
      apiKey: settings.soniox_api_key,
      sourceLanguage: settings.target_language || "auto",
      targetLanguage: "",
      customContext: null,
      vocabularyTerms: settings.vocabulary_terms,
      endpointDelayMs: settings.voice_endpoint_delay_ms,
    });

    startCapture("microphone", null).catch((err) => {
      sm.setError(`Mic error: ${err}`, true);
    });
  }, [isLoading]);

  const closeWindow = useCallback(async () => {
    await stopCapture().catch(() => {});
    soniox.disconnect();
    await getCurrentWindow().destroy();
  }, [stopCapture, soniox]);

  const handleEnd = useCallback(
    async (overrideText?: string) => {
      const text = (overrideText || accumulatedRef.current).trim();
      await stopCapture().catch(() => {});
      soniox.disconnect();

      if (!text) {
        sm.setError("No speech detected", false);
        return;
      }

      sm.stopListening();

      if (settings.llm_correction_enabled && settings.llm_correction_api_key) {
        sm.startCorrecting(text);
        try {
          const corrected = await invoke<string>("correct_transcript", {
            text,
            apiKey: settings.llm_correction_api_key,
            baseUrl: settings.llm_correction_base_url,
            model: settings.llm_correction_model,
            language: settings.llm_correction_language,
          });
          await doInsert(corrected);
        } catch {
          await doInsert(text);
        }
      } else {
        await doInsert(text);
      }
    },
    [stopCapture, soniox, settings, sm],
  );

  useEffect(() => {
    handleEndRef.current = handleEnd;
  }, [handleEnd]);

  const doInsert = useCallback(
    async (text: string) => {
      sm.startInserting(text);
      try {
        await invoke("insert_text_at_cursor", {
          text,
          pressEnter: settings.voice_enter_mode,
        });
        await navigator.clipboard.writeText(text).catch(() => {});
        sm.insertionDone(text);
        setTimeout(() => closeWindow(), 800);
      } catch (err) {
        try {
          await navigator.clipboard.writeText(text);
          sm.insertionDone(text);
          setTimeout(() => closeWindow(), 800);
        } catch {
          sm.setError(`Insert failed: ${err}`, false);
        }
      }
    },
    [settings.voice_enter_mode, sm, closeWindow],
  );

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        closeWindow();
      }
      if (e.key === "Enter" && sm.state.phase === "listening") {
        e.preventDefault();
        handleEnd();
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [sm.state.phase, closeWindow, handleEnd]);

  useEffect(() => {
    const unlisten = listen("shortcut-end", () => {
      if (sm.state.phase === "listening") {
        handleEndRef.current?.();
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [sm.state.phase]);

  useEffect(() => {
    const unlisten = getCurrentWindow().onCloseRequested(async () => {
      await stopCapture().catch(() => {});
      soniox.disconnect();
      await getCurrentWindow().destroy();
    });
    return () => {
      unlisten.then((fn) => fn());
    };
  }, [stopCapture, soniox]);

  if (isLoading) return null;

  return (
    <VoiceInputOverlay
      state={sm.state}
      onEnd={() => handleEnd()}
      onCancel={closeWindow}
    />
  );
}
