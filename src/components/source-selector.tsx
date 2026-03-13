import { useState, useRef, useEffect, useCallback } from "react";
import { useInputDevices } from "@/hooks/use-input-devices";

interface SourceSelectorProps {
  currentSource: string;
  currentDevice: string | null;
  onSelect: (source: string, device: string | null) => void;
}

export function SourceSelector({ currentSource, currentDevice, onSelect }: SourceSelectorProps) {
  const [open, setOpen] = useState(false);
  const { devices, refresh } = useInputDevices();
  const containerRef = useRef<HTMLDivElement>(null);

  const handleOpen = useCallback(async () => {
    if (open) {
      setOpen(false);
    } else {
      await refresh();
      setOpen(true);
    }
  }, [open, refresh]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("click", handler);
    return () => document.removeEventListener("click", handler);
  }, [open]);

  const sourceLabel =
    currentSource === "system"
      ? "System"
      : currentSource === "both"
        ? "Both"
        : currentDevice
          ? currentDevice.split(" ").slice(0, 2).join(" ")
          : "Mic";

  const sourceIcon =
    currentSource === "system" ? (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
      </svg>
    ) : (
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
        <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      </svg>
    );

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={handleOpen}
        className="flex items-center gap-1 h-7 px-2 border border-border rounded-md bg-background text-text-2 cursor-pointer text-xs font-medium transition-all duration-150 whitespace-nowrap max-w-32 hover:border-accent hover:text-foreground hover:bg-accent/5"
      >
        {sourceIcon}
        <span className="flex-1 overflow-hidden text-ellipsis max-w-20">{sourceLabel}</span>
        <svg
          className={`shrink-0 opacity-45 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          width="8"
          height="8"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div className="absolute top-[calc(100%+4px)] right-0 min-w-52 bg-background border border-border rounded-xl shadow-lg p-1 z-50 animate-[fade-in-up_0.12s_ease-out]">
          <SourceOption
            icon={
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
            }
            label="System Audio"
            active={currentSource === "system"}
            onClick={() => {
              setOpen(false);
              onSelect("system", null);
            }}
          />

          <div className="h-px bg-border my-1" />

          <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 py-1">
            Microphone
          </div>

          {devices.length === 0 ? (
            <div className="px-2 py-2 text-xs text-muted-foreground cursor-default">
              No microphone found
            </div>
          ) : (
            devices.map((device) => (
              <SourceOption
                key={device}
                icon={
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                  </svg>
                }
                label={device}
                active={currentSource === "microphone" && currentDevice === device}
                onClick={() => {
                  setOpen(false);
                  onSelect("microphone", device);
                }}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}

function SourceOption({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-2 px-2 py-2 rounded-md cursor-pointer text-xs transition-all duration-150 ${
        active
          ? "bg-accent-glow text-accent"
          : "text-text-2 hover:bg-accent/5 hover:text-foreground"
      }`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
