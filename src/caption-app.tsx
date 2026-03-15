import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useSettings } from "@/hooks/use-settings";
import { useAudioCapture } from "@/hooks/use-audio-capture";
import { useHistory } from "@/hooks/use-history";
import { useTranscript } from "@/hooks/use-transcript";
import { useSoniox } from "@/hooks/use-soniox";
import { useAiService } from "@/hooks/use-ai-service";
import { OverlayView } from "@/components/overlay-view";
import { ToastContainer, showToast } from "@/components/toast";

export function CaptionApp() {
  const { settings, updateSettings, reloadSettings, isLoading } = useSettings();
  const { startCapture, stopCapture, setOnAudioData } = useAudioCapture();
  const history = useHistory();
  const { appendTranscript } = useTranscript();
  const soniox = useSoniox();
  const ai = useAiService();

  const [currentSource, setCurrentSource] = useState("system");
  const [currentDevice, setCurrentDevice] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);
  const isRunningRef = useRef(false);

  useEffect(() => {
    if (!isLoading) {
      setCurrentSource(settings.audio_source === "both" ? "system" : settings.audio_source || "system");
    }
  }, [isLoading, settings.audio_source]);

  useEffect(() => {
    if (!isLoading && settings.ai_enabled && settings.anthropic_api_key) {
      ai.configure(settings.anthropic_api_key, settings.ai_model);
    }
  }, [isLoading, settings.ai_enabled, settings.anthropic_api_key, settings.ai_model]);

  useEffect(() => {
    soniox.onTranslationRef.current = (text: string) => {
      appendTranscript(text);
      history.addEntry(text);
    };
    soniox.onErrorRef.current = (error: string) => {
      showToast(error, "error");
    };
  }, [appendTranscript, history, soniox.onTranslationRef, soniox.onErrorRef]);

  useEffect(() => {
    setOnAudioData((pcm: Uint8Array) => {
      soniox.sendAudio(pcm.slice().buffer as ArrayBuffer);
    });
  }, [setOnAudioData, soniox]);

  useEffect(() => {
    if (settings.ai_enabled && soniox.segments.length > 0) {
      ai.syncTranscript(soniox.segments);
    }
  }, [settings.ai_enabled, soniox.segments]);

  const start = useCallback(async () => {
    if (!settings.soniox_api_key) {
      showToast("Please add your Soniox API key in Settings", "error");
      return;
    }

    setIsRunning(true);
    isRunningRef.current = true;
    await invoke("set_translating", { active: true }).catch(() => {});

    history.startSession(currentSource, settings.source_language, settings.target_language);

    soniox.connect({
      apiKey: settings.soniox_api_key,
      sourceLanguage: settings.source_language,
      targetLanguage: settings.target_language,
      customContext: settings.custom_context,
    });

    try {
      await startCapture(currentSource, currentDevice);
    } catch (err) {
      console.error("Failed to start audio capture:", err);
      showToast(`Audio error: ${err}`, "error");
      stop();
    }
  }, [settings, currentSource, currentDevice, history, soniox, startCapture]);

  const autoStartedRef = useRef(false);
  useEffect(() => {
    if (isLoading || autoStartedRef.current) return;
    autoStartedRef.current = true;
    invoke<boolean>("is_translating").then((active) => {
      if (active && !isRunningRef.current) start();
    });
  }, [isLoading, start]);

  const stop = useCallback(async () => {
    setIsRunning(false);
    isRunningRef.current = false;
    await invoke("set_translating", { active: false }).catch(() => {});
    history.endSession();

    try {
      await stopCapture();
    } catch (err) {
      console.error("Failed to stop capture:", err);
    }
    soniox.disconnect();
  }, [history, stopCapture, soniox]);

  const toggle = useCallback(() => {
    if (isRunningRef.current) stop();
    else start();
  }, [start, stop]);

  const pendingRestartRef = useRef<{ source: string; device: string | null } | null>(null);

  const handleSourceChange = useCallback(
    (source: string, device: string | null) => {
      if (isRunningRef.current) {
        pendingRestartRef.current = { source, device };
        stop().then(() => {
          setCurrentSource(source);
          setCurrentDevice(device);
        });
      } else {
        setCurrentSource(source);
        setCurrentDevice(device);
      }
    },
    [stop],
  );

  useEffect(() => {
    if (!isRunning && pendingRestartRef.current) {
      const pending = pendingRestartRef.current;
      if (currentSource === pending.source && currentDevice === pending.device) {
        pendingRestartRef.current = null;
        start();
      }
    }
  }, [isRunning, currentSource, currentDevice, start]);

  useEffect(() => {
    const unlisten = getCurrentWindow().onCloseRequested(async () => {
      await stop();
      await getCurrentWindow().destroy();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [stop]);

  const handleClear = useCallback(() => {
    soniox.clearSegments();
  }, [soniox]);

  const handleToggleAi = useCallback(async () => {
    const newVal = !settings.ai_enabled;
    await updateSettings({ ai_enabled: newVal });
    if (newVal && settings.anthropic_api_key) {
      const ok = await ai.configure(settings.anthropic_api_key, settings.ai_model);
      if (!ok) showToast("Cannot connect to AI service. Make sure ai-service is running.", "error");
    }
  }, [settings, updateSettings, ai]);

  const handleAskAi = useCallback(
    (segmentIndex: number) => {
      const seg = soniox.segments[segmentIndex];
      if (!seg) return;

      const startIdx = Math.max(0, segmentIndex - 5);
      const context = soniox.segments.slice(startIdx, segmentIndex + 1).map((s) => ({
        text: s.original,
        translation: s.translation ?? undefined,
        speaker: s.speaker ?? undefined,
        timestamp: s.createdAt,
      }));

      const question = `Analyze this statement and suggest how to respond:\n"${seg.translation || seg.original}"`;
      ai.askAi(question, context);
    },
    [soniox.segments, ai],
  );

  const handleAiSend = useCallback(
    (question: string) => {
      const recent = soniox.segments.slice(-5).map((s) => ({
        text: s.original,
        translation: s.translation ?? undefined,
        speaker: s.speaker ?? undefined,
        timestamp: s.createdAt,
      }));
      ai.askAi(question, recent);
    },
    [soniox.segments, ai],
  );

  useEffect(() => {
    const unlisten = listen<string>("menu-event", async (event) => {
      const id = event.payload;

      const isTraySettingsEvent =
        id.startsWith("lang-source-") ||
        id.startsWith("lang-target-") ||
        id.startsWith("ai-model-") ||
        id === "ai-toggle" ||
        id === "source-system" ||
        id === "source-mic" ||
        id === "source-both";

      if (isTraySettingsEvent) {
        await reloadSettings();
        return;
      }

      if (id === "start") toggle();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [toggle, reloadSettings]);

  useEffect(() => {
    const unlisten = listen("settings-changed", () => {
      reloadSettings();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [reloadSettings]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "Enter") { e.preventDefault(); toggle(); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggle]);

  if (isLoading) return null;

  return (
    <>
      <OverlayView
        status={soniox.status}
        isRunning={isRunning}
        currentSource={currentSource}
        currentDevice={currentDevice}
        segments={soniox.segments}
        provisionalText={soniox.provisionalText}
        fontSize={settings.font_size}
        opacity={settings.overlay_opacity}
        aiEnabled={settings.ai_enabled}
        aiMessages={ai.messages}
        aiStreaming={ai.isStreaming}
        aiConfigured={ai.isConfigured}
        onToggle={toggle}
        onSourceChange={handleSourceChange}
        onClear={handleClear}
        onToggleAi={handleToggleAi}
        onAskAi={handleAskAi}
        onAiSend={handleAiSend}
        onAiStop={ai.stopStreaming}
        onAiClear={ai.clearMessages}
      />
      <ToastContainer />
    </>
  );
}
