import { useEffect, useState } from "react";

interface ToastData {
  message: string;
  type: "success" | "error" | "info";
  id: number;
}

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
      className={`toast toast--${toast.type} ${visible ? "toast--visible" : "toast--hidden"}`}
    >
      {toast.message}
    </div>
  );
}
