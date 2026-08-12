export function PasswordMeter({ level, label }: { level: 0 | 1 | 2 | 3; label: string }) {
  return (
    <div className="flex items-center gap-3" aria-live="polite">
      <div className="flex flex-1 gap-1">
        {[1, 2, 3].map((n) => (
          <span
            key={n}
            className={`h-1.5 flex-1 rounded-full ${
              level >= n ? "bg-[var(--leaf)]" : "bg-[var(--ink)]/10"
            }`}
          />
        ))}
      </div>
      <span className="w-12 text-right text-xs font-medium text-[var(--ink)]/45">{label}</span>
    </div>
  );
}
