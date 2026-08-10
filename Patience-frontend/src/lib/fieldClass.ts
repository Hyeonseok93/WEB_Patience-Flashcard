/** Shared text-input styling for the auth forms, varying only by accent focus color. */
export function fieldClass(accent: "leaf" | "gold"): string {
  const focus =
    accent === "gold"
      ? "focus:border-[var(--gold)] focus:ring-[var(--gold)]/20"
      : "focus:border-[var(--leaf)] focus:ring-[var(--leaf)]/15";
  return `mt-1.5 w-full rounded-2xl border border-[var(--ink)]/12 bg-white/70 px-4 py-3 text-[0.95rem] outline-none transition focus:bg-white focus:ring-4 ${focus}`;
}
