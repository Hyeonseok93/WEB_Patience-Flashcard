import { type ReactNode } from "react";
import { playAction, type ApplyOptions, type PlayActionKind } from "./actions";
import { type GameSnapshot } from "./engine";

export function shortcutHint(lv: number): string {
  const base = "단축키: 클릭/Space/Enter · 기억 1/→ · 까먹음 2/←";
  return lv === 1 ? `${base} · 다음 3/N` : base;
}

export function CardActions({
  lv,
  cardId,
  snapshot,
  exiting,
  onAction,
}: {
  lv: number;
  cardId: number;
  snapshot: GameSnapshot;
  exiting: boolean;
  onAction: (
    updater: (prev: GameSnapshot) => GameSnapshot,
    options?: ApplyOptions,
  ) => void;
}) {
  const isBottom = lv === 1;

  function run(kind: PlayActionKind) {
    const preview = playAction(snapshot, lv, cardId, kind);
    if (!preview) return;
    onAction((prev) => playAction(prev, lv, cardId, kind)?.next ?? prev, preview.options);
  }

  const rememberOff = exiting || playAction(snapshot, lv, cardId, "remember") == null;
  const forgetOff = exiting || playAction(snapshot, lv, cardId, "forget") == null;
  const nextOff = exiting || playAction(snapshot, lv, cardId, "next") == null;

  return (
    <div className="mt-2 flex justify-center gap-2">
      <ActionBtn kind="remember" disabled={rememberOff} onClick={() => run("remember")}>
        기억
      </ActionBtn>
      <ActionBtn kind="forget" disabled={forgetOff} onClick={() => run("forget")}>
        까먹음
      </ActionBtn>
      {isBottom ? (
        <ActionBtn kind="next" disabled={nextOff} onClick={() => run("next")}>
          다음
        </ActionBtn>
      ) : null}
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
  kind: PlayActionKind;
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
