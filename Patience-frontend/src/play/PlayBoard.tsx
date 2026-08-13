import { useEffect, useRef, useState, type CSSProperties, type Dispatch, type SetStateAction } from "react";
import { type ApplyOptions } from "./actions";
import { CardActions, shortcutHint } from "./CardActions";
import { type GameSnapshot } from "./engine";
import { CLASSIC_CARD_H_RATIO, FOCUS_CARD_ASPECT, FOCUS_CARD_RATIO, LAYOUT, STACK_IN_MS } from "./layout";
import { levelLabel } from "./labels";
import { PlayCard } from "./PlayCard";
import { type CardLookup } from "./progressCodec";

export type PlayActionHandler = (
  updater: (prev: GameSnapshot) => GameSnapshot,
  options?: ApplyOptions,
) => void;

type SharedProps = {
  snapshot: GameSnapshot;
  active: number;
  lookup: CardLookup;
  exiting: boolean;
  flipped: boolean;
  mainEnterId: number | null;
  onAction: PlayActionHandler;
};

export function LevelsColumn({
  levelOrder,
  snapshot,
  active,
  limits,
  lookup,
  exiting,
  flipped,
  mainEnterId,
  mainEnterNonce,
  forcedStackInIds,
  setFlipped,
  onAction,
  compact = false,
  fill = false,
  suppressActions = false,
}: SharedProps & {
  levelOrder: number[];
  limits: Record<number, number>;
  mainEnterNonce: number;
  forcedStackInIds: Set<number>;
  setFlipped: Dispatch<SetStateAction<boolean>>;
  compact?: boolean;
  fill?: boolean;
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

  const n = levelOrder.length;
  return (
    <div
      className={`grid gap-1.5 [container-type:inline-size] ${fill ? "h-full min-h-0" : ""}`}
      style={
        {
          gridTemplateRows: fill ? `repeat(${n}, minmax(0, 1fr))` : undefined,
          "--card-w": fill ? "clamp(56px, 22cqi, 88px)" : "clamp(44px, 16cqi, 62px)",
          "--card-h": `calc(var(--card-w) * ${CLASSIC_CARD_H_RATIO})`,
          "--card-small-width-scale": String(LAYOUT.smallWidthScale),
          "--card-small-height-scale": String(LAYOUT.smallHeightScale),
          "--card-large-font-size": fill ? "13px" : "12px",
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
          mainEnterId={mainEnterId}
          mainEnterNonce={mainEnterNonce}
          forcedStackInIds={forcedStackInIds}
          compact
          fill={fill}
          suppressActions={suppressActions}
          onFlip={() => setFlipped((v) => !v)}
          onAction={onAction}
        />
      ))}
    </div>
  );
}

export function FocusPane({
  variant,
  snapshot,
  active,
  lookup,
  exiting,
  flipped,
  mainEnterId,
  focusSizeScale,
  focusWidthScale,
  onFlip,
  onAction,
}: SharedProps & {
  variant: "side" | "top";
  focusSizeScale: number;
  focusWidthScale: number;
  onFlip: () => void;
}) {
  const cardId = snapshot.levels[active]?.[0];
  const texts = cardId != null ? lookup.byId.get(cardId) : undefined;
  const isTop = variant === "top";

  const cardBox =
    cardId == null ? (
      <div
        className={`flex w-full items-center justify-center rounded-2xl border border-dashed border-[var(--ink)]/10 text-xs text-[var(--ink)]/30 ${
          isTop ? "min-h-0 flex-1" : "min-h-28"
        }`}
      >
        비어 있어요
      </div>
    ) : isTop ? (
      <div className="flex min-h-0 w-full flex-1 justify-center">
        <div className="h-full min-h-[7.5rem]" style={{ width: `${Math.round(focusWidthScale * 1000) / 10}%` }}>
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
      <div className="relative min-h-0 w-full flex-1 [container-type:size]">
        <div
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{
            aspectRatio: FOCUS_CARD_ASPECT,
            width: `calc(min(100cqw, 100cqh * ${FOCUS_CARD_RATIO}) * ${focusSizeScale})`,
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
      <div className={`shrink-0 ${isTop ? "pt-1" : "pt-2"}`}>
        <CardActions lv={active} cardId={cardId} snapshot={snapshot} exiting={exiting} onAction={onAction} />
        <p className="mt-1.5 hidden text-center text-[0.7rem] text-[var(--ink)]/35 lg:block">
          {shortcutHint(active)}
        </p>
      </div>
    );

  return (
    <section
      className={`flex w-full flex-col overflow-hidden rounded-[1.6rem] bg-white/75 px-3 shadow-[0_10px_30px_rgba(21,38,31,0.06)] ring-1 ring-[var(--mist)] sm:px-4 ${
        isTop ? "h-full min-h-0 py-2.5 sm:py-3" : "h-full min-h-0 py-3 sm:py-4"
      }`}
    >
      <div className={`flex w-full shrink-0 items-center justify-between gap-3 px-1 ${isTop ? "mb-1" : "mb-2 sm:mb-3"}`}>
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--moss)] text-[0.7rem] font-bold text-[var(--sand)]">
            {active}
          </span>
          <p className="text-sm font-semibold text-[var(--moss)]">{levelLabel(active, snapshot.levelCount)}</p>
        </div>
        <p className="text-[0.7rem] font-medium text-[var(--ink)]/35">확대 보기</p>
      </div>
      <div className="flex min-h-0 w-full flex-1 flex-col">
        {cardBox}
        {actions}
      </div>
    </section>
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
  mainEnterId,
  mainEnterNonce,
  forcedStackInIds,
  compact = false,
  fill = false,
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
  mainEnterId: number | null;
  mainEnterNonce: number;
  forcedStackInIds: Set<number>;
  compact?: boolean;
  fill?: boolean;
  suppressActions?: boolean;
  onFlip: () => void;
  onAction: PlayActionHandler;
}) {
  const locked = lv !== active;
  const cards = snapshot.levels[lv];
  const prevCardsRef = useRef<number[]>([]);
  const [enteringIds, setEnteringIds] = useState<Set<number>>(() => new Set());
  const classicSlotMinH = "calc(var(--card-h) * var(--card-large-height-scale))" as const;
  const compactSlotMinH =
    `calc(var(--card-h) * var(--card-small-height-scale, ${LAYOUT.smallHeightScale}))` as const;

  useEffect(() => {
    const prev = new Set(prevCardsRef.current);
    const fresh = new Set<number>();
    for (const id of cards) {
      if (!prev.has(id)) fresh.add(id);
    }
    prevCardsRef.current = cards;
    setEnteringIds(fresh);
    if (fresh.size === 0) return;
    const t = window.setTimeout(() => setEnteringIds(new Set()), STACK_IN_MS);
    return () => window.clearTimeout(t);
  }, [cards]);

  return (
    <section
      className={`flex min-h-0 flex-col rounded-[1.6rem] transition ${
        compact
          ? `${fill ? "h-full" : ""} overflow-hidden px-2.5 py-1.5 sm:px-3`
          : "overflow-hidden px-3 py-4 sm:px-5"
      } ${
        locked
          ? "pointer-events-none bg-white/35 opacity-50"
          : "bg-white/70 shadow-[0_10px_30px_rgba(21,38,31,0.06)] ring-1 ring-[var(--mist)]"
      }`}
    >
      <div className={`flex shrink-0 items-center justify-between gap-3 px-1 ${compact ? "mb-1" : "mb-3"}`}>
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold ${
              locked ? "bg-[var(--ink)]/8 text-[var(--ink)]/40" : "bg-[var(--moss)] text-[var(--sand)]"
            }`}
          >
            {lv}
          </span>
          <p className={`truncate text-sm font-semibold ${locked ? "text-[var(--ink)]/40" : "text-[var(--moss)]"}`}>
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
            fill ? "min-h-0 flex-1" : ""
          }`}
          style={fill ? undefined : { minHeight: compact ? compactSlotMinH : classicSlotMinH }}
        >
          비어 있어요
        </div>
      ) : (
        <div
          className={`flex min-h-0 flex-nowrap items-center justify-center gap-0 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
            fill ? "flex-1 py-1" : compact ? "py-0.5" : "items-end pb-1"
          }`}
          style={fill ? undefined : { minHeight: compact ? compactSlotMinH : classicSlotMinH }}
        >
          {cards.map((cardId, idx) => {
            const large = !compact && idx === 0;
            const isActiveCard = !locked && idx === 0;
            const texts = lookup.byId.get(cardId);
            const enterMotion =
              enteringIds.has(cardId) || forcedStackInIds.has(cardId) ? "stack-in" : "none";
            const mainEnter = isActiveCard && mainEnterId === cardId;
            return (
              <div
                key={mainEnter ? `c-${cardId}-enter-${mainEnterNonce}` : `c-${cardId}`}
                className="relative shrink-0 text-center"
                style={
                  compact
                    ? {
                        zIndex: LAYOUT.topZ - idx,
                        marginLeft: idx >= 1 ? `calc(var(--card-w) * ${LAYOUT.compactOverlap})` : undefined,
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
                    <CardActions lv={lv} cardId={cardId} snapshot={snapshot} exiting={exiting} onAction={onAction} />
                    <p className="mt-2 text-[0.7rem] text-[var(--ink)]/35">
                      {shortcutHint(lv)}
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
