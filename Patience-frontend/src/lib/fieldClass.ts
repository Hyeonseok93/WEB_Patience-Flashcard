/** Shared text-input styling for the auth forms, varying only by accent focus color. */
export function fieldClass(
  accent: "leaf" | "gold",
  tone: "default" | "ok" | "bad" = "default",
): string {
  const ring =
    tone === "bad"
      ? "border-[#c45c3e] focus:border-[#c45c3e] focus:ring-[#c45c3e]/15"
      : tone === "ok"
        ? "border-[var(--leaf)]/55 focus:border-[var(--leaf)] focus:ring-[var(--leaf)]/15"
        : accent === "gold"
          ? "border-[var(--ink)]/12 focus:border-[var(--gold)] focus:ring-[var(--gold)]/20"
          : "border-[var(--ink)]/12 focus:border-[var(--leaf)] focus:ring-[var(--leaf)]/15";
  return `w-full rounded-2xl border bg-white/70 px-4 py-3 text-[0.95rem] outline-none transition focus:bg-white focus:ring-4 ${ring}`;
}
