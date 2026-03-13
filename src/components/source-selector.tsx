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
    <div className="source-selector" ref={containerRef}>
      <button onClick={handleOpen} className="source-btn">
        {sourceIcon}
        <span className="source-btn-label">{sourceLabel}</span>
        <svg
          className={`source-chevron ${open ? "source-chevron--open" : ""}`}
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
        <div className="source-dropdown">
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

          <div className="source-divider" />

          <div className="source-section-label">Microphone</div>

          {devices.length === 0 ? (
            <div className="source-empty">No microphone found</div>
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
      className={`source-option ${active ? "source-option--active" : "source-option--inactive"}`}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}
