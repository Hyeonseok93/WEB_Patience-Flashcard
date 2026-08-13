import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ApiError, api, type ProgressPayload } from "../api/client";
import { useToast } from "../ui/toast-context";
import { type ApplyOptions } from "./actions";
import {
  getActiveLevel,
  MAX_LEVELS,
  MIN_LEVELS,
  shuffle,
  totalInHand as handCount,
  totalRemaining,
  type GameSnapshot,
} from "./engine";
import {
  CARD_IN_MS,
  COUNTER_BUMP_MS,
  EXIT_MS,
  SAVE_DEBOUNCE_MS,
  SAVE_FAIL_TOAST_GAP_MS,
  STACK_IN_MS,
} from "./layout";
import {
  buildCardLookup,
  buildClearedVictory,
  buildFresh,
  buildFromSaved,
  DEFAULT_LEVEL_COUNT,
  toPayload,
  type CardLookup,
} from "./progressCodec";

export type StartMode = "shuffle" | "order";
export type StartIntent = { mode: StartMode | null; levels: number; nonce: string };

export function readStartIntent(): StartIntent {
  const sp = new URLSearchParams(window.location.search);
  const lv = Number(sp.get("levels"));
  const levels = lv >= MIN_LEVELS && lv <= MAX_LEVELS ? lv : DEFAULT_LEVEL_COUNT;
  const mode: StartMode | null =
    sp.get("shuffle") === "1" ? "shuffle" : sp.get("order") === "1" ? "order" : null;
  const nonce = sp.get("n") ?? "";
  return { mode, levels, nonce };
}

export function usePlaySession(deckId: number) {
  const navigate = useNavigate();
  const toast = useToast();
  const [startIntent] = useState<StartIntent>(readStartIntent);

  const [deckName, setDeckName] = useState("");
  const [lookup, setLookup] = useState<CardLookup | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [resetMode, setResetMode] = useState<StartMode | null>(null);
  const [exiting, setExiting] = useState(false);
  const [counterBump, setCounterBump] = useState(false);
  const [mainEnterId, setMainEnterId] = useState<number | null>(null);
  const [forcedStackInIds, setForcedStackInIds] = useState<Set<number>>(() => new Set());
  const [mainEnterNonce, setMainEnterNonce] = useState(0);

  const saveTimer = useRef<number | null>(null);
  const applyTimer = useRef<number | null>(null);
  const prevCompleted = useRef(0);
  const cardIdsRef = useRef<number[]>([]);
  const latestRef = useRef<GameSnapshot | null>(null);
  const savedRef = useRef<string>("");
  const saveFailToastAt = useRef(0);
  const prevFrontRef = useRef<{ level: number; id: number | null }>({ level: 0, id: null });

  useEffect(() => {
    if (!Number.isFinite(deckId)) {
      navigate("/", { replace: true });
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const [detail, progress] = await Promise.all([
          api.deckDetail(deckId),
          api.getProgress(deckId),
        ]);
        if (cancelled) return;

        if (!detail.cards.length) {
          setAccessDenied(false);
          setError("이 세트에 카드가 없습니다.");
          return;
        }

        const nextLookup = buildCardLookup(detail.cards);
        cardIdsRef.current = nextLookup.ids;
        setDeckName(detail.name);
        setLookup(nextLookup);

        let next: GameSnapshot;
        if (startIntent.mode) {
          const startKey = `patience.startIntent:${deckId}:${startIntent.mode}:${startIntent.levels}:${startIntent.nonce}`;
          const alreadyStarted = startIntent.nonce !== "" && sessionStorage.getItem(startKey) === "1";
          if (!alreadyStarted) {
            if (startIntent.nonce) sessionStorage.setItem(startKey, "1");
            await api.resetProgress(deckId);
            if (cancelled) return;
            next = buildFresh(nextLookup.ids, startIntent.mode, startIntent.levels, shuffle);
            navigate(`/play/${deckId}`, { replace: true });
          } else {
            next = resumeOrFresh(progress, nextLookup, startIntent.mode, startIntent.levels);
          }
        } else {
          const parsed = progress.exists ? buildFromSaved(progress, nextLookup) : null;
          if (progress.exists && !parsed) {
            toast.error("저장된 진행도를 읽을 수 없어 처음부터 시작해요.");
            try {
              await api.resetProgress(deckId);
            } catch {
              /* next autosave overwrites */
            }
            next = buildFresh(nextLookup.ids, "order", startIntent.levels, shuffle);
          } else {
            next =
              parsed ??
              buildClearedVictory(progress, nextLookup) ??
              buildFresh(nextLookup.ids, "order", startIntent.levels, shuffle);
          }
        }

        setSnapshot(next);
        prevCompleted.current = next.completedCount;
      } catch (err) {
        if (!cancelled) {
          setAccessDenied(err instanceof ApiError && err.status === 403);
          setError(err instanceof ApiError ? err.message : "플레이 데이터를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deckId, navigate, startIntent, toast]);

  useEffect(() => {
    if (!snapshot) return;
    latestRef.current = snapshot;
    if (totalRemaining(snapshot) === 0) return;
    const payload = toPayload(snapshot);
    const serialized = JSON.stringify(payload);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => {
      void api
        .saveProgress(deckId, payload)
        .then(() => {
          savedRef.current = serialized;
        })
        .catch(() => {
          const now = Date.now();
          if (now - saveFailToastAt.current > SAVE_FAIL_TOAST_GAP_MS) {
            saveFailToastAt.current = now;
            toast.error("진행도 저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
          }
        });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [snapshot, deckId, toast]);

  useEffect(() => {
    return () => {
      if (applyTimer.current) window.clearTimeout(applyTimer.current);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      const snap = latestRef.current;
      if (!snap || totalRemaining(snap) === 0) return;
      const payload = toPayload(snap);
      if (JSON.stringify(payload) === savedRef.current) return;
      api.saveProgressBeacon(deckId, payload);
    };
  }, [deckId]);

  const active = useMemo(
    () => (snapshot ? getActiveLevel(snapshot.levels, snapshot.levelCount) : 1),
    [snapshot],
  );

  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.completedCount > prevCompleted.current) {
      prevCompleted.current = snapshot.completedCount;
      setCounterBump(true);
      const t = window.setTimeout(() => setCounterBump(false), COUNTER_BUMP_MS);
      return () => window.clearTimeout(t);
    }
    prevCompleted.current = snapshot.completedCount;
  }, [snapshot]);

  useEffect(() => {
    if (!snapshot || exiting) return;
    const id = snapshot.levels[active]?.[0] ?? null;
    const prev = prevFrontRef.current;
    const sameLevelFrontChanged =
      prev.id != null && id != null && prev.level === active && prev.id !== id;
    prevFrontRef.current = { level: active, id };
    if (!sameLevelFrontChanged) return;
    setMainEnterId(id);
    setMainEnterNonce((n) => n + 1);
    const t = window.setTimeout(() => setMainEnterId(null), CARD_IN_MS);
    return () => window.clearTimeout(t);
  }, [snapshot, active, exiting]);

  const apply = useCallback((
    updater: (prev: GameSnapshot) => GameSnapshot,
    options?: ApplyOptions,
  ) => {
    const animateExit = options?.animateExit !== false;

    const markStackIn = () => {
      if (options?.reappearAsStack == null) return;
      const id = options.reappearAsStack;
      setForcedStackInIds(new Set([id]));
      window.setTimeout(() => {
        setForcedStackInIds((prev) => {
          if (!prev.has(id)) return prev;
          const nextSet = new Set(prev);
          nextSet.delete(id);
          return nextSet;
        });
      }, STACK_IN_MS);
    };

    if (animateExit) {
      if (exiting) return;
      setExiting(true);
      if (applyTimer.current) window.clearTimeout(applyTimer.current);
      applyTimer.current = window.setTimeout(() => {
        setSnapshot((prev) => (prev ? updater(prev) : prev));
        setFlipped(false);
        setExiting(false);
        markStackIn();
        applyTimer.current = null;
      }, EXIT_MS);
      return;
    }
    if (exiting) return;
    setSnapshot((prev) => (prev ? updater(prev) : prev));
    setFlipped(false);
    markStackIn();
  }, [exiting]);

  async function restart(levels: number) {
    const mode: StartMode = resetMode === "shuffle" ? "shuffle" : "order";
    setResetMode(null);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    try {
      await api.resetProgress(deckId);
    } catch {
      toast.error("서버 초기화에 실패했어요. 화면만 다시 시작해요.");
    }
    savedRef.current = "";
    setSnapshot(buildFresh(cardIdsRef.current, mode, levels, shuffle));
    prevCompleted.current = 0;
    setFlipped(false);
  }

  return {
    loading,
    error,
    accessDenied,
    deckName,
    lookup,
    snapshot,
    active,
    remaining: snapshot ? totalRemaining(snapshot) : 0,
    totalInHand: snapshot ? handCount(snapshot) : 0,
    flipped,
    setFlipped,
    exiting,
    counterBump,
    mainEnterId,
    mainEnterNonce,
    forcedStackInIds,
    resetMode,
    setResetMode,
    apply,
    restart,
  };
}

function resumeOrFresh(
  progress: ProgressPayload,
  lookup: CardLookup,
  mode: StartMode,
  levels: number,
): GameSnapshot {
  if (progress.exists) {
    return (
      buildFromSaved(progress, lookup) ??
      buildFresh(lookup.ids, mode, levels, shuffle)
    );
  }
  return (
    buildClearedVictory(progress, lookup) ??
    buildFresh(lookup.ids, mode, levels, shuffle)
  );
}
