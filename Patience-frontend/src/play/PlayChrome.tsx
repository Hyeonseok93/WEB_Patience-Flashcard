import { useEffect, useState } from "react";
import { ShuffleIcon as SharedShuffleIcon } from "../ui/DeckBarIcons";
import { GLANCE_DESKTOP_MQ, type LayoutMode } from "./layout";

export function useDesktopGlance() {
  const [desktop, setDesktop] = useState(() => window.matchMedia(GLANCE_DESKTOP_MQ).matches);
  useEffect(() => {
    const mq = window.matchMedia(GLANCE_DESKTOP_MQ);
    const onChange = () => setDesktop(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return desktop;
}

export function LayoutSketch({ mode, active }: { mode: LayoutMode; active: boolean }) {
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

export function GearIcon() {
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

export function ShuffleIcon() {
  return <SharedShuffleIcon />;
}


export function ResetIcon() {
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

export function Slider({
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

export function ColorField({
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
