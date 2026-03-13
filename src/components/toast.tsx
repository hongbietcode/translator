import { useEffect, useState } from "react";

interface ToastData {
  message: string;
  type: "success" | "error" | "info";
  id: number;
}

const STYLES: Record<string, string> = {
  success: "bg-[#f0fdf4] text-[#15803d] border-[#bbf7d0] shadow-[0_4px_12px_rgba(22,163,74,0.12)]",
  error: "bg-[#fef2f2] text-[#b91c1c] border-[#fecaca] shadow-[0_4px_12px_rgba(220,38,38,0.12)]",
  info: "bg-[#eff6ff] text-[#1d4ed8] border-[#bfdbfe] shadow-[0_4px_12px_rgba(59,130,246,0.12)]",
};

let showToastFn: ((message: string, type: "success" | "error" | "info") => void) | null = null;

export function showToast(message: string, type: "success" | "error" | "info" = "success") {
  showToastFn?.(message, type);
}

export function ToastContainer() {
  const [toast, setToast] = useState<ToastData | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    showToastFn = (message, type) => {
      const id = Date.now();
      setToast({ message, type, id });
      setVisible(true);
      const duration = type === "error" ? 5000 : 3000;
      setTimeout(() => setVisible(false), duration);
      setTimeout(() => setToast((cur) => (cur?.id === id ? null : cur)), duration + 300);
    };
    return () => {
      showToastFn = null;
    };
  }, []);

  if (!toast) return null;

  return (
    <div
      className={`fixed bottom-4 left-1/2 px-4 py-2 rounded-sm text-xs font-medium pointer-events-none z-[1000] max-w-[90%] text-center leading-relaxed border transition-all duration-300 ${STYLES[toast.type]} ${
        visible ? "opacity-100 -translate-x-1/2 translate-y-0" : "opacity-0 -translate-x-1/2 translate-y-12"
      }`}
    >
      {toast.message}
    </div>
  );
}
