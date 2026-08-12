import { useEffect, useState } from "react";
import { ApiError } from "../api/client";

const DEBOUNCE_MS = 300;

export function useAvailableField(
  value: string,
  normalize: (raw: string) => string,
  invalidReason: (normalized: string) => string | null,
  check: (normalized: string) => Promise<{ available: boolean; message: string }>,
) {
  const [note, setNote] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const normalized = normalize(value);
    const local = invalidReason(normalized);
    setOk(false);
    if (!normalized) {
      setNote(null);
      setChecking(false);
      return;
    }
    if (local) {
      setNote(local);
      setChecking(false);
      return;
    }
    setChecking(true);
    setNote("확인 중…");
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const result = await check(normalized);
        if (cancelled) return;
        setOk(result.available);
        setNote(result.message);
      } catch (err) {
        if (cancelled) return;
        setOk(false);
        setNote(
          err instanceof ApiError && err.status === 429
            ? "확인이 잠시 밀렸어요. 조금 뒤에 다시 쳐 보세요."
            : "확인하지 못했어요. 잠시 후 다시 쳐 보세요.",
        );
      } finally {
        if (!cancelled) setChecking(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [value, normalize, invalidReason, check]);

  return { note, ok, checking, setNote, setOk };
}
