import { useState, type CSSProperties } from "react";
import { Link, useParams } from "react-router-dom";
import { limitsFor } from "../play/engine";
import {
  CARD_IN_MS,
  CLASSIC_CARD_H_RATIO,
  EXIT_MS,
  LAYOUT_OPTIONS,
  STACK_IN_MS,
  type LayoutMode,
} from "../play/layout";
import { ColorField, GearIcon, LayoutSketch, ResetIcon, ShuffleIcon, Slider, useDesktopGlance } from "../play/PlayChrome";
import { FocusPane, LevelsColumn } from "../play/PlayBoard";
import { usePlayKeyboard } from "../play/usePlayKeyboard";
import { usePlaySession } from "../play/usePlaySession";
import LevelPicker from "../ui/LevelPicker";

export default function PlayPage() {
  const { deckId: deckIdParam } = useParams();
  const deckId = Number(deckIdParam);
  const session = usePlaySession(deckId);
  const [fontSize, setFontSize] = useState(22);
  const [widthScale, setWidthScale] = useState(2.2);
  const [heightScale, setHeightScale] = useState(1);
  const [focusSizeScale, setFocusSizeScale] = useState(0.82);
  const [focusWidthScale, setFocusWidthScale] = useState(1);
  const [frontColor, setFrontColor] = useState("#faf6ee");
  const [backColor, setBackColor] = useState("#ffffff");
  const [frontTextColor, setFrontTextColor] = useState("#15261f");
  const [backTextColor, setBackTextColor] = useState("#1f4a3a");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>("classic");
  const glanceDesktop = useDesktopGlance();

  usePlayKeyboard({
    snapshot: session.snapshot,
    settingsOpen,
    resetMode: session.resetMode,
    exiting: session.exiting,
    setFlipped: session.setFlipped,
    apply: session.apply,
  });

  const levelPicker = (
    <LevelPicker
      open={session.resetMode !== null}
      title={session.resetMode === "shuffle" ? "랜덤으로 다시 시작할까요?" : "초기화하고 다시 시작할까요?"}
      note={
        session.resetMode === "shuffle"
          ? "지금 진행이 지워지고 순서를 섞어 새로 시작해요."
          : "지금 진행이 지워지고 원래 순서로 다시 시작해요."
      }
      danger
      current={session.snapshot?.levelCount}
      onPick={session.restart}
      onClose={() => session.setResetMode(null)}
    />
  );

  if (session.loading) {
    return (
      <div className="grid min-h-screen place-items-center bg-[var(--cream)] text-[var(--ink)]/45">
        불러오는 중…
      </div>
    );
  }

  if (session.error || !session.snapshot || !session.lookup) {
    return (
      <main className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center px-5 text-center">
        <img src="/logo.png" alt="" className="mb-4 h-16 w-16" />
        <p className="text-[#8a3b24]">{session.error ?? "세트를 열 수 없습니다."}</p>
        <Link
          to="/"
          className="mt-6 rounded-full bg-[var(--moss)] px-6 py-3 text-sm font-semibold text-[var(--sand)]"
        >
          세트 선택으로
        </Link>
      </main>
    );
  }

  const { snapshot, lookup, active, remaining, totalInHand } = session;

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
              onClick={() => session.setResetMode("shuffle")}
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
  const boardProps = {
    snapshot,
    active,
    lookup,
    exiting: session.exiting,
    flipped: session.flipped,
    mainEnterId: session.mainEnterId,
    onAction: session.apply,
  };

  return (
    <div
      className={`flex flex-col ${layoutMode === "classic" ? "min-h-screen" : "h-dvh overflow-hidden"}`}
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
          "--card-in-ms": `${CARD_IN_MS}ms`,
          "--stack-in-ms": `${STACK_IN_MS}ms`,
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
              {session.deckName}
            </p>
            <p className="truncate text-xs text-[var(--ink)]/45">
              <span className="font-semibold text-[var(--moss)]">{snapshot.levelCount}층</span>
              {" · "}남은 {remaining}장 · 손에 {totalInHand}장 · 대기 {snapshot.queue.length}장
            </p>
          </div>

          {snapshot.completedCount > 0 && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--gold)]/45 bg-gradient-to-r from-[var(--gold)]/25 to-[var(--gold)]/10 py-1 pl-1 pr-2.5 shadow-[0_4px_12px_rgba(212,162,74,0.22)] transition-transform duration-300 ${
                session.counterBump ? "scale-110" : ""
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
              onClick={() => session.setResetMode("shuffle")}
              aria-label="랜덤"
              title="랜덤"
              className="grid h-9 w-9 place-items-center rounded-full border border-[var(--moss)]/20 bg-white/70 text-[var(--moss)] transition hover:bg-white"
            >
              <ShuffleIcon />
            </button>
            <button
              type="button"
              onClick={() => session.setResetMode("order")}
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
                <div className="grid grid-cols-2 gap-2">
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
                ) : glanceDesktop ? (
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
            {...boardProps}
            levelOrder={levelOrder}
            limits={limits}
            mainEnterNonce={session.mainEnterNonce}
            forcedStackInIds={session.forcedStackInIds}
            setFlipped={session.setFlipped}
          />
        ) : glanceDesktop ? (
          <div className="grid min-h-0 flex-1 grid-cols-[minmax(0,2fr)_minmax(0,1fr)] items-stretch gap-3">
            <div className="min-h-0 min-w-0">
              <FocusPane
                {...boardProps}
                variant="side"
                focusSizeScale={focusSizeScale}
                focusWidthScale={focusWidthScale}
                onFlip={() => session.setFlipped((v) => !v)}
              />
            </div>
            <div className="min-h-0 min-w-0 overflow-hidden">
              <LevelsColumn
                {...boardProps}
                compact
                fill
                suppressActions
                levelOrder={levelOrder}
                limits={limits}
                mainEnterNonce={session.mainEnterNonce}
                forcedStackInIds={session.forcedStackInIds}
                setFlipped={session.setFlipped}
              />
            </div>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-1 flex-col gap-2 overflow-hidden">
            <div className="min-h-0 flex-1">
              <FocusPane
                {...boardProps}
                variant="top"
                focusSizeScale={focusSizeScale}
                focusWidthScale={focusWidthScale}
                onFlip={() => session.setFlipped((v) => !v)}
              />
            </div>
            <div className="shrink-0 px-0.5">
              <LevelsColumn
                {...boardProps}
                compact
                suppressActions
                levelOrder={levelOrder}
                limits={limits}
                mainEnterNonce={session.mainEnterNonce}
                forcedStackInIds={session.forcedStackInIds}
                setFlipped={session.setFlipped}
              />
            </div>
          </div>
        )}
      </main>
      {levelPicker}
    </div>
  );
}
