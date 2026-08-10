import type { ReactNode } from "react";

type AuthStageProps = {
  mascotSrc: string;
  mascotAlt: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  children: ReactNode;
  accent?: "moss" | "gold";
};

export default function AuthStage({
  mascotSrc,
  mascotAlt,
  eyebrow,
  title,
  subtitle,
  children,
  accent = "moss",
}: AuthStageProps) {
  const accentColor = accent === "gold" ? "var(--gold)" : "var(--leaf)";

  return (
    <main className="min-h-screen lg:grid lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
      <section className="relative overflow-hidden bg-[var(--moss-deep)] text-[var(--sand)]">
        <div
          className="animate-soft-glow pointer-events-none absolute -left-24 top-16 h-72 w-72 rounded-full blur-3xl"
          style={{ background: "rgba(61,122,92,0.45)" }}
        />
        <div
          className="animate-soft-glow pointer-events-none absolute -right-16 bottom-10 h-64 w-64 rounded-full blur-3xl"
          style={{ background: "rgba(212,162,74,0.28)", animationDelay: "1.2s" }}
        />

        <div className="relative z-10 flex min-h-[42vh] flex-col justify-between px-8 py-10 sm:px-12 lg:min-h-screen lg:px-14 lg:py-14">
          <div className="animate-fade-up">
            <div className="flex items-center gap-4">
              <p
                className="font-display text-[clamp(2.1rem,4.6vw,3.4rem)] leading-[1.08] tracking-[-0.03em]"
                style={{ color: accentColor }}
              >
                Patience
                <br />
                Flashcard
              </p>
              <BrandCardPack accent={accent} />
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-[var(--sand)]/75">
              외우고 싶은 건 무엇이든. 한 장씩, 내 속도로 쌓아 갑니다.
            </p>
          </div>

          <div
            className="animate-fade-up flex flex-1 items-center justify-center py-8 lg:py-0"
            style={{ animationDelay: "0.12s" }}
          >
            <img
              src={mascotSrc}
              alt={mascotAlt}
              className="animate-mascot-float w-[min(78%,340px)] max-w-md select-none drop-shadow-[0_24px_40px_rgba(0,0,0,0.45)] lg:w-[min(86%,420px)]"
              draggable={false}
            />
          </div>
        </div>
      </section>

      <section className="relative flex items-center px-6 py-12 sm:px-10 lg:px-16">
        <div className="animate-fade-up mx-auto w-full max-w-md" style={{ animationDelay: "0.08s" }}>
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--leaf)]">{eyebrow}</p>
          <h1 className="font-display mt-3 text-[2rem] font-semibold tracking-[-0.02em] text-[var(--ink)] sm:text-[2.35rem]">
            {title}
          </h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-[var(--ink)]/65">{subtitle}</p>
          <div className="mt-9">{children}</div>
        </div>
      </section>
    </main>
  );
}

function BrandCardPack({ accent }: { accent: "moss" | "gold" }) {
  const dot = accent === "gold" ? "var(--gold)" : "var(--leaf)";

  return (
    <div
      aria-hidden
      className="relative h-[clamp(3.4rem,7vw,4.9rem)] w-[clamp(3.4rem,7vw,4.9rem)] shrink-0 select-none drop-shadow-[0_8px_18px_rgba(0,0,0,0.35)]"
    >
      {/* back card */}
      <div className="absolute right-1 top-2 h-[78%] w-[74%] rotate-[12deg] rounded-[0.7rem] bg-[var(--sand)] opacity-90 shadow-[0_6px_14px_rgba(0,0,0,0.3)]" />
      {/* middle card */}
      <div className="absolute left-1 top-1 h-[80%] w-[76%] rotate-[-8deg] rounded-[0.7rem] bg-[var(--cream)] shadow-[0_6px_14px_rgba(0,0,0,0.3)]" />
      {/* front card */}
      <div className="absolute inset-x-0 bottom-0 flex h-[88%] flex-col justify-between rounded-[0.75rem] bg-white p-2 shadow-[0_10px_20px_rgba(0,0,0,0.32)] ring-1 ring-[var(--mist)]">
        <span className="h-1 w-1.5 rounded-full" style={{ background: dot }} />
        <p className="font-display text-[0.8rem] font-semibold leading-none tracking-[-0.02em] text-[var(--ink)]">
          word
        </p>
        <div className="flex gap-0.5">
          <span className="h-[3px] flex-1 rounded-full bg-[var(--moss)]/70" />
          <span className="h-[3px] flex-1 rounded-full bg-[var(--mist)]" />
        </div>
      </div>
    </div>
  );
}
