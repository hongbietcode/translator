import { useState, useEffect, useCallback } from "react";
import { listen } from "@tauri-apps/api/event";
import { useSettings } from "@/hooks/use-settings";
import { useHistory } from "@/hooks/use-history";
import { SettingsView } from "@/components/settings-view";
import { HistoryView } from "@/components/history-view";
import { ToastContainer, showToast } from "@/components/toast";

type Tab = "settings" | "history";

export function SettingsApp() {
  const { settings, updateSettings, reloadSettings, isLoading } = useSettings();
  const history = useHistory();
  const [tab, setTab] = useState<Tab>("settings");

  useEffect(() => {
    const unlisten = listen("settings-changed", () => {
      reloadSettings();
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [reloadSettings]);

  useEffect(() => {
    const unlisten = listen<string>("navigate", (event) => {
      if (event.payload === "history") setTab("history");
    });
    return () => { unlisten.then((fn) => fn()); };
  }, []);

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

  if (isLoading) return null;

  return (
    <>
      {tab === "settings" && (
        <SettingsView
          settings={settings}
          onSave={updateSettings}
          onToast={showToast}
        />
      )}
      {tab === "history" && (
        <HistoryView
          sessions={history.sessions}
          onBack={() => setTab("settings")}
          onExportSession={handleExportSession}
          onClear={handleClearHistory}
        />
      )}
      <ToastContainer />
    </>
  );
}
