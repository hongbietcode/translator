import { useState, useEffect, useCallback, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import type { Settings } from "@/types/settings";
import { DEFAULT_SETTINGS } from "@/types/settings";

export function useSettings() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const settingsRef = useRef<Settings>(DEFAULT_SETTINGS);
  const listenersRef = useRef<Array<(s: Settings) => void>>([]);

  settingsRef.current = settings;

  useEffect(() => {
    invoke<Settings>("get_settings")
      .then((s) => setSettings({ ...DEFAULT_SETTINGS, ...s }))
      .catch(() => setSettings(DEFAULT_SETTINGS))
      .finally(() => setIsLoading(false));
  }, []);

  const updateSettings = useCallback(
    async (newSettings: Partial<Settings>) => {
      const merged = { ...settingsRef.current, ...newSettings };
      await invoke("save_settings", { newSettings: merged });
      setSettings(merged);
      listenersRef.current.forEach((cb) => cb(merged));
    },
    [],
  );

  const onChange = useCallback((cb: (s: Settings) => void) => {
    listenersRef.current.push(cb);
    return () => {
      listenersRef.current = listenersRef.current.filter((l) => l !== cb);
    };
  }, []);

  return { settings, updateSettings, isLoading, onChange };
}
