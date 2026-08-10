import { useEffect, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";

type ModalShellProps = {
  open: boolean;
  labelledBy: string;
  onClose: () => void;
  children: ReactNode;
};

const FOCUSABLE =
  'a[href],button:not([disabled]),textarea,input,select,[tabindex]:not([tabindex="-1"])';

/**
 * Accessible modal wrapper shared by Confirm and LevelPicker. Provides the backdrop, panel shell,
 * scroll lock, Escape-to-close, a focus trap, and focus restoration on close.
 */
export default function ModalShell({ open, labelledBy, onClose, children }: ModalShellProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const items = () =>
      panelRef.current ? Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)) : [];
    items()[0]?.focus();

    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const focusables = items();
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const activeEl = document.activeElement as HTMLElement | null;
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      restoreRef.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center px-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby={labelledBy}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[var(--moss-deep)]/55 backdrop-blur-[2px]"
        aria-label="닫기"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        className="animate-fade-up relative w-full max-w-sm rounded-[1.6rem] bg-[var(--cream)] p-6 shadow-[0_20px_50px_rgba(21,38,31,0.28)] ring-1 ring-[var(--mist)]"
      >
        <img src="/logo.png" alt="" className="mx-auto h-14 w-14" />
        {children}
      </div>
    </div>,
    document.body,
  );
}
