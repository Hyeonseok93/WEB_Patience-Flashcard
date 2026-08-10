import { useCallback, useMemo, useRef, useState, type ReactNode } from "react";
import ModalShell from "./ModalShell";
import { ConfirmContext, type ConfirmOptions } from "./confirm-context";

type Pending = ConfirmOptions & {
  resolve: (value: boolean) => void;
};

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<Pending | null>(null);
  const pendingRef = useRef<Pending | null>(null);

  const close = useCallback((value: boolean) => {
    pendingRef.current?.resolve(value);
    pendingRef.current = null;
    setPending(null);
  }, []);

  const confirm = useCallback((options: ConfirmOptions) => {
    return new Promise<boolean>((resolve) => {
      const next = { ...options, resolve };
      pendingRef.current = next;
      setPending(next);
    });
  }, []);

  const api = useMemo(() => ({ confirm }), [confirm]);

  return (
    <ConfirmContext.Provider value={api}>
      {children}
      <ModalShell open={pending !== null} labelledBy="confirm-title" onClose={() => close(false)}>
        {pending && (
          <>
            <h2
              id="confirm-title"
              className="font-display mt-4 text-center text-[1.35rem] font-semibold tracking-[-0.02em] text-[var(--ink)] [word-break:keep-all] text-balance"
            >
              {pending.title}
            </h2>
            <p className="mx-auto mt-2 max-w-[17rem] whitespace-pre-line text-center text-sm leading-relaxed text-[var(--ink)]/60 [word-break:keep-all] text-pretty">
              {pending.message}
            </p>
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => close(true)}
                className={`rounded-full px-4 py-3 text-sm font-semibold transition ${
                  pending.danger
                    ? "bg-[#8a3b24] text-[#fff6f1] hover:brightness-95"
                    : "bg-[var(--moss)] text-[var(--sand)] hover:bg-[var(--moss-deep)]"
                }`}
              >
                {pending.confirmLabel ?? "확인"}
              </button>
              <button
                type="button"
                onClick={() => close(false)}
                className="rounded-full bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)]/70 ring-1 ring-[var(--mist)] transition hover:bg-[var(--sand)]"
              >
                {pending.cancelLabel ?? "취소"}
              </button>
            </div>
          </>
        )}
      </ModalShell>
    </ConfirmContext.Provider>
  );
}
