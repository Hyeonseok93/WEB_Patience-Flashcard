import { useEffect, useMemo, useRef, useState, type CSSProperties, type Dispatch, type ReactNode, type SetStateAction } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError, api } from "../api/client";
import {
  BOTTOM_LIMIT,
  forgetRotateLevel1,
  forgetTopToBottom,
  getActiveLevel,
  limitsFor,
  MAX_LEVELS,
  MIN_LEVELS,
  moveCard,
  pullNextToLevel1,
  removeFromTop,
  shuffle,
  totalInHand as handCount,
  totalRemaining,
  type GameSnapshot,
} from "../play/engine";
import {
  buildCardLookup,
  buildFresh,
  buildFromSaved,
  DEFAULT_LEVEL_COUNT,
  toPayload,
  type CardLookup,
} from "../play/progressCodec";
import LevelPicker from "../ui/LevelPicker";
import { useToast } from "../ui/toast-context";

/**
 * Card-exit animation duration in ms. MUST stay in sync with `.animate-card-out` in index.css.
 * We also push it to the DOM as the `--exit-ms` custom property so CSS reads the same value.
 */
const EXIT_MS = 240;
const SAVE_DEBOUNCE_MS = 400;

/** Layout tuning for the card stack, kept in one place instead of scattered magic numbers. */
const LAYOUT = {
  smallWidthScale: 0.92,
  smallHeightScale: 0.52,
  largeMarginRight: 0.1,
  smallOverlap: -0.5,
  topZ: 50,
} as const;

type StartMode = "shuffle" | "order";
type StartIntent = { mode: StartMode | null; levels: number };
type LayoutMode = "classic" | "left" | "top";

/** Landscape focus card — wider than tall, not a huge tall block. */
const FOCUS_CARD_ASPECT = "2.05 / 1";
/** Same base ratio as classic `--card-h` so overview minis keep that silhouette. */
const CLASSIC_CARD_H_RATIO = 1.38;

const LAYOUT_OPTIONS: {
  id: LayoutMode;
  label: string;
  hint: string;
}[] = [
  { id: "classic", label: "1 클래식", hint: "층을 세로로" },
  { id: "left", label: "2 왼쪽 확대", hint: "와이드 한눈" },
  { id: "top", label: "3 위쪽 확대", hint: "세로 한눈" },
];


function readStartIntent(): StartIntent {
  const sp = new URLSearchParams(window.location.search);
  const lv = Number(sp.get("levels"));
  const levels = lv >= MIN_LEVELS && lv <= MAX_LEVELS ? lv : DEFAULT_LEVEL_COUNT;
  const mode: StartMode | null =
    sp.get("shuffle") === "1" ? "shuffle" : sp.get("order") === "1" ? "order" : null;
  return { mode, levels };
}

function levelLabel(level: number, levelCount: number): string {
  if (level === 1) return "지금 보는 카드";
  if (level === levelCount) return "거의 외웠어요";
  return "익숙해지는 중";
}

export default function PlayPage() {
  const { deckId: deckIdParam } = useParams();
  const deckId = Number(deckIdParam);
  const navigate = useNavigate();
  const toast = useToast();
  // Captured once at mount so later URL rewrites (stripping the destructive start params) never
  // re-trigger the load effect.
  const [startIntent] = useState<StartIntent>(readStartIntent);

  const [deckName, setDeckName] = useState("");
  const [lookup, setLookup] = useState<CardLookup | null>(null);
  const [snapshot, setSnapshot] = useState<GameSnapshot | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [fontSize, setFontSize] = useState(22);
  const [widthScale, setWidthScale] = useState(2.2);
  const [heightScale, setHeightScale] = useState(1);
  /** Layout 2: overall focus card size vs pane (0.4–1). */
  const [focusSizeScale, setFocusSizeScale] = useState(0.82);
  /** Layout 3: focus card width vs full pane width (0.4–1). Height stays fixed. */
  const [focusWidthScale, setFocusWidthScale] = useState(1);
  const [frontColor, setFrontColor] = useState("#faf6ee");
  const [backColor, setBackColor] = useState("#ffffff");
  const [frontTextColor, setFrontTextColor] = useState("#15261f");
  const [backTextColor, setBackTextColor] = useState("#1f4a3a");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("classic");
  const [resetMode, setResetMode] = useState<StartMode | null>(null);
  const [exiting, setExiting] = useState(false);
  const [counterBump, setCounterBump] = useState(false);

  const initRef = useRef(false);
  const saveTimer = useRef<number | null>(null);
  const applyTimer = useRef<number | null>(null);
  const prevCompleted = useRef(0);
  const cardIdsRef = useRef<number[]>([]);
  const latestRef = useRef<GameSnapshot | null>(null);
  const savedRef = useRef<string>("");
  const saveFailToastAt = useRef(0);

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
          setError("이 세트에 카드가 없습니다.");
          return;
        }

        const nextLookup = buildCardLookup(detail.cards);
        cardIdsRef.current = nextLookup.ids;
        setDeckName(detail.name);
        setLookup(nextLookup);

        let next: GameSnapshot;
        if (startIntent.mode && !initRef.current) {
          // Consume the one-time start intent, then strip it from the URL so a refresh (F5)
          // never re-runs this destructive reset.
          initRef.current = true;
          await api.resetProgress(deckId);
          if (cancelled) return;
          next = buildFresh(nextLookup.ids, startIntent.mode, startIntent.levels, shuffle);
          navigate(`/play/${deckId}`, { replace: true });
        } else if (progress.exists) {
          next =
            buildFromSaved(progress, nextLookup) ??
            buildFresh(nextLookup.ids, "order", startIntent.levels, shuffle);
        } else {
          next = buildFresh(nextLookup.ids, "order", startIntent.levels, shuffle);
        }

        setSnapshot(next);
        prevCompleted.current = next.completedCount;
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof ApiError ? err.message : "플레이 데이터를 불러오지 못했습니다.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [deckId, navigate, startIntent]);

  // Debounced autosave. Tracks the latest snapshot and records what was actually persisted so the
  // unmount flush can decide whether a final write is still needed.
  useEffect(() => {
    if (!snapshot) return;
    latestRef.current = snapshot;
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
          if (now - saveFailToastAt.current > 4000) {
            saveFailToastAt.current = now;
            toast.error("진행도 저장에 실패했어요. 잠시 후 다시 시도해 주세요.");
          }
        });
    }, SAVE_DEBOUNCE_MS);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [snapshot, deckId, toast]);

  // Mount-only cleanup: clear timers and flush any unsaved move on the way out so leaving the
  // screen (e.g. "세트 선택") before the debounce fires never loses the last action.
  useEffect(() => {
    return () => {
      if (applyTimer.current) window.clearTimeout(applyTimer.current);
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      const snap = latestRef.current;
      if (!snap) return;
      const payload = toPayload(snap);
      if (JSON.stringify(payload) === savedRef.current) return;
      api.saveProgressBeacon(deckId, payload);
    };
  }, [deckId]);

  // Briefly pulse the "cl: N" badge whenever the completed count grows.
  useEffect(() => {
    if (!snapshot) return;
    if (snapshot.completedCount > prevCompleted.current) {
      prevCompleted.current = snapshot.completedCount;
      setCounterBump(true);
      const t = window.setTimeout(() => setCounterBump(false), 320);
      return () => window.clearTimeout(t);
    }
    prevCompleted.current = snapshot.completedCount;
  }, [snapshot]);

  const active = useMemo(
    () => (snapshot ? getActiveLevel(snapshot.levels, snapshot.levelCount) : 1),
    [snapshot],
  );

  const remaining = snapshot ? totalRemaining(snapshot) : 0;
  const totalInHand = snapshot ? handCount(snapshot) : 0;

  // Only slide the main card in when the front card of the *same* active level changed
  // (기억/1층 까먹음). Switching active level after an upper-level 까먹음 must not re-animate
  // a level-1 main card that was already sitting there.
  const prevFrontRef = useRef<{ level: number; id: number | null }>({ level: 0, id: null });
  const [mainEnterId, setMainEnterId] = useState<number | null>(null);
  /** Cards that should stack-in even if they were already on the floor (e.g. L1 까먹음 → 맨 뒤로). */
  const [forcedStackInIds, setForcedStackInIds] = useState<Set<number>>(() => new Set());
  const [mainEnterNonce, setMainEnterNonce] = useState(0);

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
    const t = window.setTimeout(() => setMainEnterId(null), 380);
    return () => window.clearTimeout(t);
  }, [snapshot, active, exiting]);

  function apply(
    updater: (prev: GameSnapshot) => GameSnapshot,
    options?: { animateExit?: boolean; reappearAsStack?: number },
  ) {
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
      }, 420);
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
    // "다음"처럼 활성 카드는 그대로 두고 옆 카드만 들어올 때 — exit/in 모션 없음.
    if (exiting) return;
    setSnapshot((prev) => (prev ? updater(prev) : prev));
    setFlipped(false);
    markStackIn();
  }

  async function restart(levels: number) {
    const mode: StartMode = resetMode === "shuffle" ? "shuffle" : "order";
    setResetMode(null);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    try {
      await api.resetProgress(deckId);
    } catch {
      // If the reset call fails we still rebuild locally; the next autosave will reconcile.
    }
    savedRef.current = "";
    setSnapshot(buildFresh(cardIdsRef.current, mode, levels, shuffle));
    prevCompleted.current = 0;
    setFlipped(false);
  }

  // Keyboard: Space/Enter flip, 1/ArrowRight remember, 2/ArrowLeft forget, 3 next (level 1).
  useEffect(() => {
    if (!snapshot || settingsOpen || resetMode !== null) return;
    const current = snapshot;
    const remainingNow = totalRemaining(current);
    if (remainingNow === 0) return;

    const activeLevel = getActiveLevel(current.levels, current.levelCount);
    const activeId = current.levels[activeLevel][0];
    if (activeId == null) return;
    const level1Ready =
      current.levels[1].length >= BOTTOM_LIMIT || current.queue.length === 0;
    const topLevel = current.levelCount;

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!exiting) setFlipped((v) => !v);
        return;
      }
      if (exiting) return;

      if (e.key === "1" || e.key === "ArrowRight") {
        e.preventDefault();
        if (activeLevel === 1) {
          if (!level1Ready) return;
          apply((s) => moveCard(s, 1, activeId, "remember"));
        } else if (activeLevel === topLevel) {
          apply((s) => removeFromTop(s, activeId));
        } else {
          apply((s) => moveCard(s, activeLevel, activeId, "remember"));
        }
        return;
      }
      if (e.key === "2" || e.key === "ArrowLeft") {
        e.preventDefault();
        if (activeLevel === 1) {
          if (!level1Ready) return;
          apply((s) => forgetRotateLevel1(s), { reappearAsStack: activeId });
        } else if (activeLevel === topLevel) {
          apply((s) => forgetTopToBottom(s, activeId));
        } else {
          apply((s) => moveCard(s, activeLevel, activeId, "forget"));
        }
        return;
      }
      if ((e.key === "3" || e.key === "n" || e.key === "N") && activeLevel === 1) {
        e.preventDefault();
        if (current.levels[1].length >= BOTTOM_LIMIT || current.queue.length === 0) return;
        apply((s) => pullNextToLevel1(s), { animateExit: false });
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // apply closes over exiting/timers; re-bind whenever the play state changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [snapshot, settingsOpen, resetMode, exiting]);

  const levelPicker = (
    <LevelPicker
      open={resetMode !== null}
      title={resetMode === "shuffle" ? "랜덤으로 다시 시작할까요?" : "초기화하고 다시 시작할까요?"}
      note={
        resetMode === "shuffle"
          ? "지금 진행이 지워지고 순서를 섞어 새로 시작해요."
          : "지금 진행이 지워지고 원래 순서로 다시 시작해요."
      }
      danger
      current={snapshot?.levelCount}
      onPick={restart}
      onClose={() => setResetMode(null)}
    />
  );

  if (loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--cream)] text-[var(--ink)]/45">
        불러오는 중…
      </div>
    );
  }

  if (error || !snapshot || !lookup) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 text-center">
        <img src="/logo.png" alt="" className="mb-4 h-16 w-16" />
        <p className="text-[#8a3b24]">{error ?? "세트를 열 수 없습니다."}</p>
        <Link
          to="/"
          className="mt-6 rounded-full bg-[var(--moss)] px-6 py-3 text-sm font-semibold text-[var(--sand)]"
        >
          세트 선택으로
        </Link>
      </main>
    );
  }

  if (remaining === 0) {
    return (
      <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[var(--moss-deep)] px-5 text-[var(--sand)]">
        <div
          className="animate-soft-glow pointer-events-none absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "rgba(61,122,92,0.4)" }}
        />
        <div className="animate-fade-up relative z-10 text-center">
          <img
            src="/logo.png"
            alt=""
            className="mx-auto h-28 w-28 drop-shadow-[0_16px_30px_rgba(0,0,0,0.4)]"
          />
          <p className="font-display mt-6 text-[clamp(2rem,5vw,2.8rem)] font-semibold tracking-[-0.02em]">
            다 외웠어요
          </p>
          <p className="mt-3 text-[var(--sand)]/70">완전히 외운 카드 {snapshot.completedCount}장</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => setResetMode("shuffle")}
              className="rounded-full border border-[var(--sand)]/25 px-6 py-3 text-sm font-semibold transition hover:bg-white/5"
            >
              다시 한번
            </button>
            <Link
              to="/"
              className="rounded-full bg-[var(--gold)] px-6 py-3 text-sm font-semibold text-[var(--moss-deep)] transition hover:brightness-95"
            >
              세트 선택으로
            </Link>
          </div>
        </div>
        {levelPicker}
      </main>
    );
  }

  const limits = limitsFor(snapshot.levelCount);
  const levelOrder = Array.from({ length: snapshot.levelCount }, (_, i) => snapshot.levelCount - i);
  const level1Ready = snapshot.levels[1].length >= BOTTOM_LIMIT || snapshot.queue.length === 0;

  return (
    <div
      className="flex min-h-screen flex-col"
      style={
        {
          "--card-w": "clamp(96px, 15vw, 148px)",
          "--card-h": `calc(var(--card-w) * ${CLASSIC_CARD_H_RATIO})`,
          "--card-large-font-size": `${fontSize}px`,
          "--card-large-width-scale": String(widthScale),
          "--card-large-height-scale": String(heightScale),
          "--focus-size-scale": String(focusSizeScale),
          "--focus-width-scale": String(focusWidthScale),
          "--card-front-bg": frontColor,
          "--card-front-fg": frontTextColor,
          "--card-back-bg": backColor,
          "--card-back-fg": backTextColor,
          "--exit-ms": `${EXIT_MS}ms`,
        } as CSSProperties
      }
    >
      <header className="sticky top-0 z-30 border-b border-[var(--mist)] bg-[var(--cream)]/85 backdrop-blur-md">
        <div
          className={`mx-auto flex w-full flex-wrap items-center gap-3 px-4 py-3 sm:px-5 ${
            layoutMode === "classic" ? "max-w-6xl" : "max-w-none"
          }`}
        >
          <Link
            to="/"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--mist)] bg-white/70 py-1.5 pl-2.5 pr-4 text-[1.05rem] font-semibold tracking-[-0.02em] text-[var(--ink)]/60 transition hover:bg-white hover:text-[var(--ink)]"
          >
            <img src="/logo.png" alt="" className="h-9 w-9" />
            <span className="hidden sm:inline">세트 선택</span>
            <span className="sm:hidden">←</span>
          </Link>

          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="truncate font-display text-[1.05rem] font-semibold tracking-[-0.02em] text-[var(--moss)]">
              {deckName}
            </p>
            <p className="truncate text-xs text-[var(--ink)]/45">
              <span className="font-semibold text-[var(--moss)]">{snapshot.levelCount}층</span>
              {" · "}남은 {remaining}장 · 손에 {totalInHand}장 · 대기 {snapshot.queue.length}장
            </p>
          </div>

          {snapshot.completedCount > 0 && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/45 bg-gradient-to-r from-[var(--gold)]/25 to-[var(--gold)]/10 py-1 pl-1 pr-2.5 shadow-[0_4px_12px_rgba(212,162,74,0.22)] transition-transform duration-300 ${
                counterBump ? "scale-110" : ""
              }`}
            >
              <span className="grid h-5 w-5 place-items-center rounded-full bg-[var(--gold)] text-white shadow-[0_2px_5px_rgba(212,162,74,0.5)]">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3 w-3"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3.2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              </span>
              <span className="text-xs font-medium text-[var(--ink)]/55">클리어</span>
              <span className="text-sm font-bold tabular-nums text-[var(--moss-deep)]">
                {snapshot.completedCount}
              </span>
            </span>
          )}

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setResetMode("shuffle")}
              aria-label="랜덤"
              title="랜덤"
              className="grid h-9 w-9 place-items-center rounded-full border border-[var(--moss)]/20 bg-white/70 text-[var(--moss)] transition hover:bg-white"
            >
              <ShuffleIcon />
            </button>
            <button
              type="button"
              onClick={() => setResetMode("order")}
              aria-label="초기화"
              title="초기화"
              className="grid h-9 w-9 place-items-center rounded-full border border-[#a2452a]/25 bg-white/70 text-[#a2452a] transition hover:bg-[#f8ebe4]"
            >
              <ResetIcon />
            </button>
            <button
              type="button"
              onClick={() => setSettingsOpen((v) => !v)}
              aria-expanded={settingsOpen}
              aria-label="설정"
              title="설정"
              className={`grid h-9 w-9 place-items-center rounded-full border transition ${
                settingsOpen
                  ? "border-transparent bg-[var(--moss)] text-[var(--sand)]"
                  : "border-[var(--mist)] bg-white/70 text-[var(--ink)]/70 hover:bg-white"
              }`}
            >
              <GearIcon />
            </button>
          </div>
        </div>

        {settingsOpen && (
          <div className="animate-fade-up border-t border-[var(--mist)] bg-white/70">
            <div className={`mx-auto w-full space-y-4 px-5 py-4 ${layoutMode === "classic" ? "max-w-6xl" : "max-w-none"}`}>
              <div>
                <p className="mb-2 text-xs font-semibold tracking-wide text-[var(--ink)]/45">카드 UI</p>
                <div className="grid grid-cols-3 gap-2">
                  {LAYOUT_OPTIONS.map((opt) => {
                    const selected = layoutMode === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setLayoutMode(opt.id)}
                        aria-pressed={selected}
                        className={`flex flex-col items-center gap-2 rounded-2xl border px-2 py-3 transition ${
                          selected
                            ? "border-[var(--moss)] bg-[var(--moss)]/8 shadow-[0_6px_16px_rgba(31,74,58,0.12)]"
                            : "border-[var(--mist)] bg-white/70 hover:bg-white"
                        }`}
                      >
                        <LayoutSketch mode={opt.id} active={selected} />
                        <span
                          className={`text-center text-[0.78rem] font-semibold leading-tight ${
                            selected ? "text-[var(--moss)]" : "text-[var(--ink)]/70"
                          }`}
                        >
                          {opt.label}
                        </span>
                        <span className="text-center text-[0.65rem] text-[var(--ink)]/35">{opt.hint}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div
                className={`border-t border-[var(--mist)] pt-4 ${
                  layoutMode === "classic"
                    ? "flex flex-wrap gap-x-8 gap-y-3"
                    : "grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2"
                }`}
              >
                <Slider
                  label="글자"
                  min={12}
                  max={42}
                  step={1}
                  value={fontSize}
                  display={String(fontSize)}
                  onChange={setFontSize}
                />
                {layoutMode === "classic" ? (
                  <>
                    <Slider
                      label="너비"
                      min={1.4}
                      max={3.6}
                      step={0.1}
                      value={widthScale}
                      display={widthScale.toFixed(1)}
                      onChange={setWidthScale}
                    />
                    <Slider
                      label="높이"
                      min={0.5}
                      max={1.8}
                      step={0.05}
                      value={heightScale}
                      display={heightScale.toFixed(2)}
                      onChange={setHeightScale}
                    />
                  </>
                ) : layoutMode === "left" ? (
                  <Slider
                    label="크기"
                    min={0.4}
                    max={1}
                    step={0.02}
                    value={focusSizeScale}
                    display={`${Math.round(focusSizeScale * 100)}%`}
                    onChange={setFocusSizeScale}
                  />
                ) : (
                  <Slider
                    label="너비"
                    min={0.4}
                    max={1}
                    step={0.02}
                    value={focusWidthScale}
                    display={`${Math.round(focusWidthScale * 100)}%`}
                    onChange={setFocusWidthScale}
                  />
                )}
              </div>

              <div className="grid gap-x-8 gap-y-3 border-t border-[var(--mist)] pt-4 sm:grid-cols-2">
                <ColorField
                  label="앞 배경"
                  value={frontColor}
                  onChange={setFrontColor}
                  swatches={["#faf6ee", "#f3ead7", "#ffffff", "#e8f0ea", "#f6e7de", "#1f4a3a"]}
                />
                <ColorField
                  label="앞 글자"
                  value={frontTextColor}
                  onChange={setFrontTextColor}
                  swatches={["#15261f", "#1f4a3a", "#8a3b24", "#3d7a5c", "#d4a24a", "#faf6ee"]}
                />
                <ColorField
                  label="뒤 배경"
                  value={backColor}
                  onChange={setBackColor}
                  swatches={["#ffffff", "#e7d9bc", "#e8f0ea", "#1f4a3a", "#3d7a5c", "#d4a24a"]}
                />
                <ColorField
                  label="뒤 글자"
                  value={backTextColor}
                  onChange={setBackTextColor}
                  swatches={["#1f4a3a", "#15261f", "#8a3b24", "#3d7a5c", "#d4a24a", "#faf6ee"]}
                />
              </div>
            </div>
          </div>
        )}
      </header>

      <main
        className={`flex w-full min-h-0 flex-1 flex-col px-3 sm:px-4 ${
          layoutMode === "classic"
            ? "mx-auto max-w-6xl overflow-y-auto px-4 py-8 sm:px-5"
            : settingsOpen
              ? "max-w-none overflow-y-auto pt-3 pb-5"
              : "max-w-none overflow-hidden pt-3 pb-5"
        }`}
      >
        {layoutMode === "classic" ? (
          <LevelsColumn
            levelOrder={levelOrder}
            snapshot={snapshot}
            active={active}
            limits={limits}
            lookup={lookup}
            exiting={exiting}
            flipped={flipped}
            level1Ready={level1Ready}
            mainEnterId={mainEnterId}
            mainEnterNonce={mainEnterNonce}
            forcedStackInIds={forcedStackInIds}
            setFlipped={setFlipped}
            onAction={apply}
          />
        ) : layoutMode === "left" ? (
          <div className="grid min-h-0 flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] md:items-stretch">
            <div className="min-h-0 min-w-0">
              <FocusPane
                variant="side"
                snapshot={snapshot}
                active={active}
                lookup={lookup}
                exiting={exiting}
                flipped={flipped}
                level1Ready={level1Ready}
                mainEnterId={mainEnterId}
                focusSizeScale={focusSizeScale}
                focusWidthScale={focusWidthScale}
                onFlip={() => setFlipped((v) => !v)}
                onAction={apply}
              />
            </div>
            <div className="min-h-0 min-w-0 overflow-hidden">
              <LevelsColumn
                compact
                suppressActions
                levelOrder={levelOrder}
                snapshot={snapshot}
                active={active}
                limits={limits}
                lookup={lookup}
                exiting={exiting}
                flipped={flipped}
                level1Ready={level1Ready}
                mainEnterId={mainEnterId}
                mainEnterNonce={mainEnterNonce}
                forcedStackInIds={forcedStackInIds}
                setFlipped={setFlipped}
                onAction={apply}
              />
            </div>
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-3 pb-4">
            <FocusPane
              variant="top"
              snapshot={snapshot}
              active={active}
              lookup={lookup}
              exiting={exiting}
              flipped={flipped}
              level1Ready={level1Ready}
              mainEnterId={mainEnterId}
              focusSizeScale={focusSizeScale}
              focusWidthScale={focusWidthScale}
              onFlip={() => setFlipped((v) => !v)}
              onAction={apply}
            />
            <div className="min-h-0 flex-[1.55] overflow-x-hidden overflow-y-auto px-1 pb-3">
              <LevelsColumn
                compact
                suppressActions
                levelOrder={levelOrder}
                snapshot={snapshot}
                active={active}
                limits={limits}
                lookup={lookup}
                exiting={exiting}
                flipped={flipped}
                level1Ready={level1Ready}
                mainEnterId={mainEnterId}
                mainEnterNonce={mainEnterNonce}
                forcedStackInIds={forcedStackInIds}
                setFlipped={setFlipped}
                onAction={apply}
              />
            </div>
          </div>
        )}
      </main>
      {levelPicker}
    </div>
  );
}

function LevelsColumn({
  levelOrder,
  snapshot,
  active,
  limits,
  lookup,
  exiting,
  flipped,
  level1Ready,
  mainEnterId,
  mainEnterNonce,
  forcedStackInIds,
  setFlipped,
  onAction,
  compact = false,
  suppressActions = false,
}: {
  levelOrder: number[];
  snapshot: GameSnapshot;
  active: number;
  limits: Record<number, number>;
  lookup: CardLookup;
  exiting: boolean;
  flipped: boolean;
  level1Ready: boolean;
  mainEnterId: number | null;
  mainEnterNonce: number;
  forcedStackInIds: Set<number>;
  setFlipped: Dispatch<SetStateAction<boolean>>;
  onAction: (
    updater: (prev: GameSnapshot) => GameSnapshot,
    options?: { animateExit?: boolean; reappearAsStack?: number },
  ) => void;
  compact?: boolean;
  suppressActions?: boolean;
}) {
  if (!compact) {
    return (
      <div className="space-y-5">
        {levelOrder.map((lv) => (
          <LevelSection
            key={lv}
            lv={lv}
            snapshot={snapshot}
            active={active}
            limit={limits[lv]}
            lookup={lookup}
            exiting={exiting}
            flipped={flipped}
            level1Ready={level1Ready}
            mainEnterId={mainEnterId}
            mainEnterNonce={mainEnterNonce}
            forcedStackInIds={forcedStackInIds}
            onFlip={() => setFlipped((v) => !v)}
            onAction={onAction}
          />
        ))}
      </div>
    );
  }

  // Overview: same mini-card silhouette as classic (not flat pills). Rows tall enough to not clip.
  return (
    <div
      className="grid h-full min-h-0 gap-2.5 [container-type:inline-size]"
      style={
        {
          gridTemplateRows: `repeat(${levelOrder.length}, minmax(6.75rem, 1fr))`,
          "--card-w": "clamp(78px, 28cqi, 104px)",
          "--card-h": `calc(var(--card-w) * ${CLASSIC_CARD_H_RATIO})`,
          "--card-small-width-scale": String(LAYOUT.smallWidthScale),
          "--card-small-height-scale": String(LAYOUT.smallHeightScale),
          "--card-large-font-size": "13px",
        } as CSSProperties
      }
    >
      {levelOrder.map((lv) => (
        <LevelSection
          key={lv}
          lv={lv}
          snapshot={snapshot}
          active={active}
          limit={limits[lv]}
          lookup={lookup}
          exiting={exiting}
          flipped={flipped}
          level1Ready={level1Ready}
          mainEnterId={mainEnterId}
          mainEnterNonce={mainEnterNonce}
          forcedStackInIds={forcedStackInIds}
          compact
          suppressActions={suppressActions}
          onFlip={() => setFlipped((v) => !v)}
          onAction={onAction}
        />
      ))}
    </div>
  );
}

function FocusPane({
  variant,
  snapshot,
  active,
  lookup,
  exiting,
  flipped,
  level1Ready,
  mainEnterId,
  focusSizeScale,
  focusWidthScale,
  onFlip,
  onAction,
}: {
  /** side = layout 2 (fill left column); top = layout 3 (content-sized landscape band). */
  variant: "side" | "top";
  snapshot: GameSnapshot;
  active: number;
  lookup: CardLookup;
  exiting: boolean;
  flipped: boolean;
  level1Ready: boolean;
  mainEnterId: number | null;
  focusSizeScale: number;
  focusWidthScale: number;
  onFlip: () => void;
  onAction: (
    updater: (prev: GameSnapshot) => GameSnapshot,
    options?: { animateExit?: boolean; reappearAsStack?: number },
  ) => void;
}) {
  const cardId = snapshot.levels[active]?.[0];
  const texts = cardId != null ? lookup.byId.get(cardId) : undefined;
  const isTop = variant === "top";

  const cardBox =
    cardId == null ? (
      <div className="flex min-h-28 w-full items-center justify-center rounded-2xl border border-dashed border-[var(--ink)]/10 text-xs text-[var(--ink)]/30">
        비어 있어요
      </div>
    ) : isTop ? (
      // Height stays compact (20vh). Width % is of the full pane — 100% = edge to edge.
      <div className="flex w-full justify-center">
        <div
          style={{
            height: "20vh",
            width: `${Math.round(focusWidthScale * 1000) / 10}%`,
          }}
        >
          <PlayCard
            front={texts?.front ?? ""}
            back={texts?.back ?? ""}
            large
            fill
            isActive
            exiting={exiting}
            flipped={flipped}
            enterMotion="none"
            mainEnter={mainEnterId === cardId}
            onFlip={onFlip}
          />
        </div>
      </div>
    ) : (
      // Uniform size scale (width + height together), capped to the left pane.
      <div className="relative min-h-0 w-full flex-1 [container-type:size]">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            aspectRatio: FOCUS_CARD_ASPECT,
            width: `calc(min(100cqw, 100cqh * 2.05) * ${focusSizeScale})`,
            maxWidth: "100cqw",
            maxHeight: "100cqh",
          }}
        >
          <PlayCard
            front={texts?.front ?? ""}
            back={texts?.back ?? ""}
            large
            fill
            isActive
            exiting={exiting}
            flipped={flipped}
            enterMotion="none"
            mainEnter={mainEnterId === cardId}
            onFlip={onFlip}
          />
        </div>
      </div>
    );

  const actions =
    cardId == null ? null : (
      <div className="shrink-0 pt-2">
        <CardActions
          lv={active}
          cardId={cardId}
          snapshot={snapshot}
          exiting={exiting}
          level1Ready={level1Ready}
          onAction={onAction}
        />
        <p className="mt-1.5 text-center text-[0.7rem] text-[var(--ink)]/35">
          카드 클릭 또는 Space · 기억 1 · 까먹음 2
        </p>
      </div>
    );

  return (
    <section
      className={`flex w-full flex-col overflow-hidden rounded-[1.6rem] bg-white/75 px-3 shadow-[0_10px_30px_rgba(21,38,31,0.06)] ring-1 ring-[var(--mist)] sm:px-4 ${
        isTop ? "shrink-0 py-2.5 sm:py-3" : "h-full min-h-0 py-3 sm:py-4"
      }`}
    >
      <div className={`flex w-full shrink-0 items-center justify-between gap-3 px-1 ${isTop ? "mb-1.5" : "mb-2 sm:mb-3"}`}>
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--moss)] text-[0.7rem] font-bold text-[var(--sand)]">
            {active}
          </span>
          <p className="text-sm font-semibold text-[var(--moss)]">
            {levelLabel(active, snapshot.levelCount)}
          </p>
        </div>
        <p className="text-[0.7rem] font-medium text-[var(--ink)]/35">확대 보기</p>
      </div>

      {isTop ? (
        <>
          {cardBox}
          {actions}
        </>
      ) : (
        <div className="flex min-h-0 w-full flex-1 flex-col">
          {cardBox}
          {actions}
        </div>
      )}
    </section>
  );
}

function LayoutSketch({ mode, active }: { mode: LayoutMode; active: boolean }) {
  const ink = active ? "bg-[var(--moss)]" : "bg-[var(--ink)]/25";
  const soft = active ? "bg-[var(--moss)]/25" : "bg-[var(--ink)]/10";

  if (mode === "classic") {
    return (
      <div className="flex h-12 w-full max-w-[5.5rem] flex-col justify-center gap-1 px-1" aria-hidden>
        <div className={`h-2.5 w-full rounded-sm ${soft}`} />
        <div className={`h-2.5 w-full rounded-sm ${ink}`} />
        <div className={`h-2.5 w-full rounded-sm ${soft}`} />
      </div>
    );
  }

  if (mode === "left") {
    return (
      <div className="flex h-12 w-full max-w-[5.5rem] gap-1 px-1" aria-hidden>
        <div className={`w-[42%] rounded-sm ${ink}`} />
        <div className="flex flex-1 flex-col justify-center gap-1">
          <div className={`h-2 w-full rounded-sm ${soft}`} />
          <div className={`h-2 w-full rounded-sm ${soft}`} />
          <div className={`h-2 w-full rounded-sm ${soft}`} />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-12 w-full max-w-[5.5rem] flex-col gap-1 px-1" aria-hidden>
      <div className={`h-[48%] w-full rounded-sm ${ink}`} />
      <div className="flex flex-1 flex-col justify-center gap-0.5">
        <div className={`h-1.5 w-full rounded-sm ${soft}`} />
        <div className={`h-1.5 w-full rounded-sm ${soft}`} />
      </div>
    </div>
  );
}

function LevelSection({
  lv,
  snapshot,
  active,
  limit,
  lookup,
  exiting,
  flipped,
  level1Ready,
  mainEnterId,
  mainEnterNonce,
  forcedStackInIds,
  compact = false,
  suppressActions = false,
  onFlip,
  onAction,
}: {
  lv: number;
  snapshot: GameSnapshot;
  active: number;
  limit: number;
  lookup: CardLookup;
  exiting: boolean;
  flipped: boolean;
  level1Ready: boolean;
  mainEnterId: number | null;
  mainEnterNonce: number;
  forcedStackInIds: Set<number>;
  compact?: boolean;
  suppressActions?: boolean;
  onFlip: () => void;
  onAction: (
    updater: (prev: GameSnapshot) => GameSnapshot,
    options?: { animateExit?: boolean; reappearAsStack?: number },
  ) => void;
}) {
  const locked = lv !== active;
  const cards = snapshot.levels[lv];
  const prevCardsRef = useRef<number[]>([]);
  const [enteringIds, setEnteringIds] = useState<Set<number>>(() => new Set());
  // Classic: keep empty floors the same tall as a filled main-card slot (follows 너비/높이 settings).
  const classicSlotMinH = "calc(var(--card-h) * var(--card-large-height-scale))" as const;

  useEffect(() => {
    const prev = new Set(prevCardsRef.current);
    const fresh = new Set<number>();
    for (const id of cards) {
      if (!prev.has(id)) fresh.add(id);
    }
    prevCardsRef.current = cards;
    setEnteringIds(fresh);
    if (fresh.size === 0) return;
    const t = window.setTimeout(() => setEnteringIds(new Set()), 420);
    return () => window.clearTimeout(t);
  }, [cards]);

  return (
    <section
      className={`flex min-h-0 flex-col rounded-[1.6rem] transition ${
        compact
          ? "h-full overflow-hidden px-3 py-2.5 sm:px-3.5"
          : "overflow-hidden px-3 py-4 sm:px-5"
      } ${
        locked
          ? "pointer-events-none bg-white/35 opacity-50"
          : "bg-white/70 shadow-[0_10px_30px_rgba(21,38,31,0.06)] ring-1 ring-[var(--mist)]"
      }`}
    >
      <div className={`flex shrink-0 items-center justify-between gap-3 px-1 ${compact ? "mb-1.5" : "mb-3"}`}>
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold ${
              locked ? "bg-[var(--ink)]/8 text-[var(--ink)]/40" : "bg-[var(--moss)] text-[var(--sand)]"
            }`}
          >
            {lv}
          </span>
          <p
            className={`truncate text-sm font-semibold ${locked ? "text-[var(--ink)]/40" : "text-[var(--moss)]"}`}
          >
            {levelLabel(lv, snapshot.levelCount)}
          </p>
        </div>
        <p className="shrink-0 text-xs tabular-nums text-[var(--ink)]/35">
          {cards.length}/{limit}
        </p>
      </div>

      {cards.length === 0 ? (
        <div
          className={`flex items-center justify-center rounded-2xl border border-dashed border-[var(--ink)]/10 text-xs text-[var(--ink)]/30 ${
            compact ? "min-h-0 flex-1" : ""
          }`}
          style={compact ? undefined : { minHeight: classicSlotMinH }}
        >
          비어 있어요
        </div>
      ) : (
        <div
          className={`flex min-h-0 flex-nowrap items-center justify-center gap-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            compact ? "flex-1 py-2" : "items-end pb-1"
          }`}
          style={compact ? undefined : { minHeight: classicSlotMinH }}
        >
          {cards.map((cardId, idx) => {
            // Overview (compact): every card stays small — only the magnifier pane is large.
            const large = !compact && idx === 0;
            const isActiveCard = !locked && idx === 0;
            const texts = lookup.byId.get(cardId);
            const enterMotion =
              enteringIds.has(cardId) || forcedStackInIds.has(cardId) ? "stack-in" : "none";
            // Compact overview still needs front-card enter when the active front changes.
            const mainEnter = isActiveCard && mainEnterId === cardId;
            return (
              <div
                key={mainEnter ? `c-${cardId}-enter-${mainEnterNonce}` : `c-${cardId}`}
                className="relative shrink-0 text-center"
                style={
                  compact
                    ? {
                        zIndex: LAYOUT.topZ - idx,
                        marginLeft: idx >= 1 ? `calc(var(--card-w) * -0.38)` : undefined,
                      }
                    : large
                      ? {
                          zIndex: LAYOUT.topZ,
                          marginRight: `calc(var(--card-w) * ${LAYOUT.largeMarginRight})`,
                        }
                      : {
                          zIndex: LAYOUT.topZ - idx,
                          marginLeft: idx >= 2 ? `calc(var(--card-w) * ${LAYOUT.smallOverlap})` : undefined,
                        }
                }
              >
                <PlayCard
                  front={texts?.front ?? ""}
                  back={texts?.back ?? ""}
                  large={large}
                  isActive={isActiveCard}
                  exiting={exiting && isActiveCard}
                  flipped={flipped}
                  enterMotion={enterMotion}
                  mainEnter={mainEnter}
                  emphasize={compact && isActiveCard}
                  onFlip={onFlip}
                />

                {isActiveCard && !suppressActions && (
                  <>
                    <CardActions
                      lv={lv}
                      cardId={cardId}
                      snapshot={snapshot}
                      exiting={exiting}
                      level1Ready={level1Ready}
                      onAction={onAction}
                    />
                    <p className="mt-2 text-[0.7rem] text-[var(--ink)]/35">
                      카드 클릭 또는 Space · 기억 1 · 까먹음 2
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function PlayCard({
  front,
  back,
  large,
  fill = false,
  isActive,
  exiting,
  flipped,
  enterMotion,
  mainEnter,
  emphasize = false,
  onFlip,
}: {
  front: string;
  back: string;
  large: boolean;
  /** Fill parent box (used by focus / magnifier pane). */
  fill?: boolean;
  isActive: boolean;
  exiting: boolean;
  flipped: boolean;
  /** Newly arriving stack cards (or L1 forget → back) slide in from the right. */
  enterMotion: "stack-in" | "none";
  /** True when this card newly became the front of the active level. */
  mainEnter: boolean;
  /** Overview highlight for the current main card. */
  emphasize?: boolean;
  onFlip: () => void;
}) {
  const animation = exiting
    ? "animate-card-out"
    : mainEnter
      ? "animate-card-in"
      : enterMotion === "stack-in"
        ? "animate-stack-in"
        : "";

  return (
    <div
      role={isActive ? "button" : undefined}
      tabIndex={isActive ? 0 : undefined}
      onClick={() => isActive && onFlip()}
      onKeyDown={(e) => {
        if (!isActive) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onFlip();
        }
      }}
      className={`overflow-hidden rounded-2xl [perspective:1200px] ${fill ? "h-full w-full" : ""} ${isActive ? "cursor-pointer" : "cursor-default"} ${animation} ${
        emphasize ? "ring-2 ring-[var(--moss)]" : ""
      }`}
      style={
        fill
          ? undefined
          : {
              width: large
                ? "calc(var(--card-w) * var(--card-large-width-scale))"
                : `calc(var(--card-w) * var(--card-small-width-scale, ${LAYOUT.smallWidthScale}))`,
              height: large
                ? "calc(var(--card-h) * var(--card-large-height-scale))"
                : `calc(var(--card-h) * var(--card-small-height-scale, ${LAYOUT.smallHeightScale}))`,
            }
      }
      aria-label={isActive ? "카드 뒤집기" : undefined}
    >
      <div
        className="relative h-full w-full overflow-hidden transition-transform duration-500 [transform-style:preserve-3d]"
        style={{ transform: isActive && flipped ? "rotateY(180deg)" : undefined }}
      >
        <CardFace text={front} large={large} side="front" active={isActive} emphasize={emphasize} />
        <CardFace text={back} large={large} side="back" emphasize={emphasize} />
      </div>
    </div>
  );
}

function CardFace({
  text,
  large,
  side,
  active,
  emphasize,
}: {
  text: string;
  large: boolean;
  side: "front" | "back";
  active?: boolean;
  emphasize?: boolean;
}) {
  const back = side === "back";
  return (
    <div
      className={`absolute inset-0 overflow-hidden rounded-2xl border shadow-[0_8px_20px_rgba(21,38,31,0.08)] [backface-visibility:hidden] ${
        back
          ? emphasize
            ? "border-[var(--gold)]/70 [transform:rotateY(180deg)]"
            : "border-[var(--gold)]/40 [transform:rotateY(180deg)]"
          : emphasize
            ? "border-[var(--moss)]/55"
            : active
              ? "border-[var(--moss)]/35"
              : "border-[var(--ink)]/10"
      }`}
      style={{
        fontSize: large ? "var(--card-large-font-size)" : "clamp(10px, 1.4vw, 13px)",
        fontWeight: 600,
        background: emphasize
          ? back
            ? "color-mix(in srgb, var(--card-back-bg) 82%, var(--gold) 18%)"
            : "color-mix(in srgb, var(--card-front-bg) 78%, var(--moss) 22%)"
          : back
            ? "var(--card-back-bg)"
            : "var(--card-front-bg)",
        color: back ? "var(--card-back-fg)" : "var(--card-front-fg)",
      }}
    >
      <div
        className="card-scroll h-full w-full overflow-y-auto overflow-x-hidden px-3 py-3"
        onWheel={(e) => e.stopPropagation()}
        onPointerDown={(e) => {
          // Keep scrollbar drags from also flipping the card.
          const bounds = e.currentTarget.getBoundingClientRect();
          if (bounds.right - e.clientX <= 14) e.stopPropagation();
        }}
        onClick={(e) => {
          const bounds = e.currentTarget.getBoundingClientRect();
          if (bounds.right - e.clientX <= 14) e.stopPropagation();
        }}
      >
        <div className="flex min-h-full items-center justify-center">
          <p
            className="w-full text-center whitespace-pre-wrap"
            style={{ overflowWrap: "anywhere", wordBreak: "break-word" }}
          >
            {text}
          </p>
        </div>
      </div>
    </div>
  );
}

function CardActions({
  lv,
  cardId,
  snapshot,
  exiting,
  level1Ready,
  onAction,
}: {
  lv: number;
  cardId: number;
  snapshot: GameSnapshot;
  exiting: boolean;
  level1Ready: boolean;
  onAction: (
    updater: (prev: GameSnapshot) => GameSnapshot,
    options?: { animateExit?: boolean; reappearAsStack?: number },
  ) => void;
}) {
  const isBottom = lv === 1;
  const isTop = lv === snapshot.levelCount;

  return (
    <div className="mt-3 flex justify-center gap-2">
      {isBottom ? (
        <>
          <ActionBtn
            kind="remember"
            disabled={exiting || !level1Ready}
            onClick={() => onAction((s) => moveCard(s, 1, cardId, "remember"))}
          >
            기억
          </ActionBtn>
          <ActionBtn
            kind="forget"
            disabled={exiting || !level1Ready}
            onClick={() => onAction((s) => forgetRotateLevel1(s), { reappearAsStack: cardId })}
          >
            까먹음
          </ActionBtn>
          <ActionBtn
            kind="next"
            disabled={exiting || snapshot.levels[1].length >= BOTTOM_LIMIT || snapshot.queue.length === 0}
            onClick={() => onAction((s) => pullNextToLevel1(s), { animateExit: false })}
          >
            다음
          </ActionBtn>
        </>
      ) : isTop ? (
        <>
          <ActionBtn kind="remember" disabled={exiting} onClick={() => onAction((s) => removeFromTop(s, cardId))}>
            기억
          </ActionBtn>
          <ActionBtn kind="forget" disabled={exiting} onClick={() => onAction((s) => forgetTopToBottom(s, cardId))}>
            까먹음
          </ActionBtn>
        </>
      ) : (
        <>
          <ActionBtn
            kind="remember"
            disabled={exiting}
            onClick={() => onAction((s) => moveCard(s, lv, cardId, "remember"))}
          >
            기억
          </ActionBtn>
          <ActionBtn
            kind="forget"
            disabled={exiting}
            onClick={() => onAction((s) => moveCard(s, lv, cardId, "forget"))}
          >
            까먹음
          </ActionBtn>
        </>
      )}
    </div>
  );
}

function GearIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function ShuffleIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 18h1.4c1.3 0 2.5-.6 3.3-1.7l6.1-8.6c.8-1.1 2-1.7 3.3-1.7H22" />
      <path d="m18 2 4 4-4 4" />
      <path d="M2 6h1.9c1.5 0 2.9.9 3.6 2.2" />
      <path d="M22 18h-5.9c-1.3 0-2.6-.7-3.3-1.8l-.5-.8" />
      <path d="m18 14 4 4-4 4" />
    </svg>
  );
}

function ResetIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-[18px] w-[18px]"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.9}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
    </svg>
  );
}

function Slider({
  label,
  min,
  max,
  step,
  value,
  display,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  display: string;
  onChange: (v: number) => void;
}) {
  return (
    <label className="flex min-w-[220px] flex-1 items-center gap-3">
      <span className="w-10 shrink-0 text-xs font-medium text-[var(--ink)]/50">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="play-range w-full"
      />
      <span className="w-10 text-right text-xs tabular-nums text-[var(--ink)]/45">{display}</span>
    </label>
  );
}

function ColorField({
  label,
  value,
  onChange,
  swatches,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  swatches: string[];
}) {
  return (
    <div className="flex min-w-[240px] flex-1 items-center gap-3">
      <span className="w-12 shrink-0 whitespace-nowrap text-xs font-medium text-[var(--ink)]/50">{label}</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {swatches.map((c) => {
          const selected = c.toLowerCase() === value.toLowerCase();
          return (
            <button
              key={c}
              type="button"
              aria-label={c}
              onClick={() => onChange(c)}
              className={`h-6 w-6 rounded-full border transition ${
                selected
                  ? "border-[var(--moss)] ring-2 ring-[var(--moss)]/30"
                  : "border-[var(--ink)]/15 hover:border-[var(--ink)]/30"
              }`}
              style={{ background: c }}
            />
          );
        })}
        <label className="relative ml-0.5 grid h-6 w-6 cursor-pointer place-items-center rounded-full border border-dashed border-[var(--ink)]/30 text-[0.6rem] font-bold text-[var(--ink)]/45 hover:border-[var(--ink)]/50">
          +
          <input
            type="color"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 cursor-pointer opacity-0"
          />
        </label>
      </div>
    </div>
  );
}

function ActionBtn({
  children,
  onClick,
  disabled,
  kind,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
  kind: "remember" | "forget" | "next";
}) {
  const styles =
    kind === "remember"
      ? "bg-[var(--moss)] text-[var(--sand)] hover:bg-[var(--moss-deep)]"
      : kind === "forget"
        ? "bg-[#f3ddd4] text-[#8a3b24] hover:bg-[#edd0c4]"
        : "bg-white text-[var(--moss)] ring-1 ring-[var(--moss)]/25 hover:bg-[var(--moss)]/5";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`min-w-[4.5rem] rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-[var(--ink)]/10 disabled:text-[var(--ink)]/30 disabled:ring-0 ${styles}`}
    >
      {children}
    </button>
  );
}
