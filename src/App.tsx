import { useState, useEffect, useCallback, useRef } from "react";
import { listen } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";

import { useSettings } from "@/hooks/use-settings";
import { useAudioCapture } from "@/hooks/use-audio-capture";
import { useHistory } from "@/hooks/use-history";
import { useTranscript } from "@/hooks/use-transcript";
import { useSoniox } from "@/hooks/use-soniox";
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
          showOriginal={settings.show_original}
          backgroundColor={settings.background_color}
          textColor={settings.text_color}
          onToggle={toggle}
          onSourceChange={handleSourceChange}
          onClear={handleClear}
          subtitleMode={settings.subtitle_mode}
          onToggleSubtitle={() => updateSettings({ subtitle_mode: !settings.subtitle_mode })}
          onMinimize={() => getCurrentWindow().minimize()}
          onClose={() => getCurrentWindow().close()}
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
