import { LAYOUT } from "./layout";

export function PlayCard({
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
  fill?: boolean;
  isActive: boolean;
  exiting: boolean;
  flipped: boolean;
  enterMotion: "stack-in" | "none";
  mainEnter: boolean;
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
      className={`rounded-2xl [perspective:1200px] ${fill ? "h-full w-full" : ""} ${isActive ? "cursor-pointer" : "cursor-default"} ${animation} ${
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
        className="relative h-full w-full transition-transform duration-500 [transform-style:preserve-3d]"
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
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
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
