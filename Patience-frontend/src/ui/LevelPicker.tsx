import { limitsFor } from "../play/engine";
import ModalShell from "./ModalShell";

type LevelPickerProps = {
  open: boolean;
  title?: string;
  note?: string;
  danger?: boolean;
  current?: number;
  onPick: (levelCount: number) => void;
  onClose: () => void;
};

/** Per-level capacities, derived from the engine so the preview never drifts from real limits. */
function capacities(n: number): number[] {
  const limits = limitsFor(n);
  return Array.from({ length: n }, (_, i) => limits[i + 1]);
}

export default function LevelPicker({
  open,
  title = "몇 층으로 시작할까요?",
  note = "정한 층수는 진행 내내 유지돼요.",
  danger = false,
  current,
  onPick,
  onClose,
}: LevelPickerProps) {
  return (
    <ModalShell open={open} labelledBy="levelpicker-title" onClose={onClose}>
      <h2
        id="levelpicker-title"
        className="font-display mt-4 text-center text-[1.35rem] font-semibold tracking-[-0.02em] text-[var(--ink)] [word-break:keep-all] text-balance"
      >
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-[17rem] text-center text-sm leading-relaxed text-[var(--ink)]/60 [word-break:keep-all] text-pretty">
        {note}
      </p>

      <div className="mt-5 space-y-2.5">
        {[2, 3, 4].map((n) => {
          const isCurrent = current === n;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onPick(n)}
              className={`flex w-full items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                danger
                  ? "border-[#8a3b24]/20 hover:border-[#8a3b24]/45 hover:bg-[#f8ebe4]"
                  : "border-[var(--mist)] hover:border-[var(--moss)]/40 hover:bg-white"
              }`}
            >
              <span
                className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-sm font-bold ${
                  danger ? "bg-[#8a3b24] text-[#fff6f1]" : "bg-[var(--moss)] text-[var(--sand)]"
                }`}
              >
                {n}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-[var(--ink)]">
                  {n}층
                  {isCurrent && (
                    <span className="ml-1.5 text-xs font-medium text-[var(--ink)]/40">현재</span>
                  )}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-xs tabular-nums text-[var(--ink)]/45">
                  {capacities(n).map((c, i) => (
                    <span key={i} className="inline-flex items-center gap-1">
                      {i > 0 && <span className="text-[var(--ink)]/25">·</span>}
                      <span>{c}장</span>
                    </span>
                  ))}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        onClick={onClose}
        className="mt-4 w-full rounded-full bg-white px-4 py-3 text-sm font-semibold text-[var(--ink)]/70 ring-1 ring-[var(--mist)] transition hover:bg-[var(--sand)]"
      >
        취소
      </button>
    </ModalShell>
  );
}
