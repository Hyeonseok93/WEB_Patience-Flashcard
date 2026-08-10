import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { ToastContext, type ToastApi } from "./toast-context";

type ToastKind = "info" | "success" | "error";

type ToastItem = {
  id: number;
  kind: ToastKind;
  message: string;
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const idRef = useRef(0);

  const push = useCallback((kind: ToastKind, message: string) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2800);
  }, []);

  const api = useMemo<ToastApi>(
    () => ({
      info: (message) => push("info", message),
      success: (message) => push("success", message),
      error: (message) => push("error", message),
    }),
    [push],
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[80] flex flex-col items-center gap-2 px-4">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              role="status"
              className={`animate-fade-up pointer-events-auto max-w-md rounded-2xl px-4 py-3 text-sm font-medium shadow-[0_12px_32px_rgba(21,38,31,0.18)] backdrop-blur-md ${
                toast.kind === "success"
                  ? "bg-[var(--moss)] text-[var(--sand)]"
                  : toast.kind === "error"
                    ? "bg-[#8a3b24] text-[#fff6f1]"
                    : "bg-[var(--moss-deep)] text-[var(--sand)]"
              }`}
            >
              {toast.message}
            </div>
          ))}
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}
