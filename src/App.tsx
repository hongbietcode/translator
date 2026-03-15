import { useState, useEffect, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";

import { useSettings } from "@/hooks/use-settings";
import { useAudioCapture } from "@/hooks/use-audio-capture";
import { useHistory } from "@/hooks/use-history";
import { useTranscript } from "@/hooks/use-transcript";
import { useSoniox } from "@/hooks/use-soniox";
import { useAiService } from "@/hooks/use-ai-service";
import { OverlayView } from "@/components/overlay-view";
import { SettingsView } from "@/components/settings-view";
import { HistoryView } from "@/components/history-view";
import { ToastContainer, showToast } from "@/components/toast";

type View = "overlay" | "settings" | "history";

export default function App() {
  const { settings, updateSettings, reloadSettings, isLoading } = useSettings();
  const { startCapture, stopCapture, setOnAudioData } = useAudioCapture();
  const history = useHistory();
  const { appendTranscript } = useTranscript();
  const soniox = useSoniox();
  const ai = useAiService();

  const [currentView, setCurrentView] = useState<View>("overlay");
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
      setCurrentView("settings");
      return;
    }

    setIsRunning(true);
    isRunningRef.current = true;

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

  const stop = useCallback(async () => {
    setIsRunning(false);
    isRunningRef.current = false;
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

      const start = Math.max(0, segmentIndex - 5);
      const context = soniox.segments.slice(start, segmentIndex + 1).map((s) => ({
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

  const handleExportSession = useCallback(
    (sessionId: number) => {
      const text = history.exportSession(sessionId);
      if (!text) {
        showToast("No content to export", "info");
        return;
      }
      navigator.clipboard
        .writeText(text)
        .then(() => showToast("Copied to clipboard", "success"))
        .catch(() => showToast("Failed to copy", "error"));
    },
    [history],
  );

  const handleClearHistory = useCallback(() => {
    history.clear();
    showToast("History cleared", "success");
  }, [history]);

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

      switch (id) {
        case "start": toggle(); break;
        case "settings": setCurrentView("settings"); break;
        case "view-history": setCurrentView("history"); break;
        case "export": break;
        case "clear-history": handleClearHistory(); break;
      }
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [toggle, handleClearHistory, reloadSettings]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      const mod = e.metaKey || e.ctrlKey;
      if (mod && e.key === "Enter") { e.preventDefault(); toggle(); }
      if (e.key === "Escape") { e.preventDefault(); setCurrentView("overlay"); }
      if (mod && e.key === ",") { e.preventDefault(); setCurrentView("settings"); }
      if (mod && e.key.toLowerCase() === "h") { e.preventDefault(); setCurrentView("history"); }
      if (mod && e.key === "1") { e.preventDefault(); handleSourceChange("system", null); }
      if (mod && e.key === "2") { e.preventDefault(); handleSourceChange("microphone", null); }
      if (mod && e.key === "3") { e.preventDefault(); handleSourceChange("both", null); }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [toggle, handleSourceChange]);

  if (isLoading) return null;

  return (
    <>
      {currentView === "overlay" && (
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
      )}
      {currentView === "settings" && (
        <SettingsView
          settings={settings}
          onSave={updateSettings}
          onToast={showToast}
        />
      )}
      {currentView === "history" && (
        <HistoryView
          sessions={history.sessions}
          onBack={() => setCurrentView("overlay")}
          onExportSession={handleExportSession}
          onClear={handleClearHistory}
        />
      )}
      <ToastContainer />
    </>
  );
}
