import { useState, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function useInputDevices() {
  const [devices, setDevices] = useState<string[]>([]);

  const refresh = useCallback(async () => {
    try {
      const list = await invoke<string[]>("list_input_devices");
      setDevices(list);
      return list;
    } catch (err) {
      console.error("Failed to list devices:", err);
      return [];
    }
  }, []);

  return { devices, refresh };
}
