import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useSettings } from "@/hooks/use-settings";
import { useAudioCapture } from "@/hooks/use-audio-capture";
import { useSoniox } from "@/hooks/use-soniox";
import { VoiceInputOverlay } from "@/components/voice-input-overlay";

type VoiceInputState = "recording" | "translating" | "result" | "error";

export function VoiceInputApp() {
  const { settings, isLoading } = useSettings();
  const { startCapture, stopCapture, setOnAudioData } = useAudioCapture();
  const soniox = useSoniox();

  const [state, setState] = useState<VoiceInputState>("recording");
  const [translatedText, setTranslatedText] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [liveText, setLiveText] = useState("");
  const accumulatedRef = useRef("");
  const startedRef = useRef(false);

  useEffect(() => {
    soniox.onTranslationRef.current = null;
    soniox.onErrorRef.current = (err) => {
      setState("error");
      setErrorMsg(err);
    };
  }, [soniox.onTranslationRef, soniox.onErrorRef]);

  useEffect(() => {
    const text = soniox.segments.map((s) => s.original).join(" ");
    if (text) accumulatedRef.current = text;
    const display = (accumulatedRef.current + (soniox.provisionalText ? " " + soniox.provisionalText : "")).trim();
    setLiveText(display);
  }, [soniox.segments, soniox.provisionalText]);

  useEffect(() => {
    if (isLoading || startedRef.current) return;
    startedRef.current = true;

    if (!settings.soniox_api_key) {
      setState("error");
      setErrorMsg("No Soniox API key configured");
      return;
    }

    setOnAudioData((pcm: Uint8Array) => {
      soniox.sendAudio(pcm.slice().buffer as ArrayBuffer);
    });

    soniox.connect({
      apiKey: settings.soniox_api_key,
      sourceLanguage: settings.target_language || "auto",
      targetLanguage: "",
      customContext: null,
    });

    startCapture("microphone", null).catch((err) => {
      setState("error");
      setErrorMsg(`Mic error: ${err}`);
    });
  }, [isLoading, settings.soniox_api_key, settings.target_language, soniox, startCapture, setOnAudioData]);

  const closeWindow = useCallback(async () => {
    await stopCapture().catch(() => {});
    soniox.disconnect();
    await getCurrentWindow().destroy();
  }, [stopCapture, soniox]);

  const handleEnd = useCallback(async () => {
    const text = accumulatedRef.current.trim();
    await stopCapture().catch(() => {});
    soniox.disconnect();

    if (!text) {
      setState("error");
      setErrorMsg("No speech detected");
      return;
    }

    if (!settings.anthropic_api_key) {
      setTranslatedText(text);
      setState("result");
      return;
    }

    setState("translating");

    try {
      const result = await invoke<string>("translate_text", {
        apiKey: settings.anthropic_api_key,
        model: settings.ai_model,
        text,
        targetLanguage: settings.source_language,
      });
      setTranslatedText(result);
      setState("result");
    } catch (err) {
      setTranslatedText(text);
      setErrorMsg(`Translation failed: ${err}`);
      setState("result");
    }
  }, [stopCapture, soniox, settings]);

  const handleCopyAndClose = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(translatedText);
    } catch { /* clipboard may fail */ }
    await closeWindow();
  }, [translatedText, closeWindow]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); closeWindow(); }
      if (e.key === "Enter" && state === "recording") { e.preventDefault(); handleEnd(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [state, closeWindow, handleEnd]);

  useEffect(() => {
    const unlisten = getCurrentWindow().onCloseRequested(async () => {
      await stopCapture().catch(() => {});
      soniox.disconnect();
      await getCurrentWindow().destroy();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [stopCapture, soniox]);

  if (isLoading) return null;

  return (
    <VoiceInputOverlay
      state={state}
      liveText={liveText}
      translatedText={translatedText}
      errorMsg={errorMsg}
      onEnd={handleEnd}
      onCopyAndClose={handleCopyAndClose}
      onCancel={closeWindow}
    />
  );
}
