import { Link } from "react-router-dom";
import mascotDenied from "../assets/images/mascot-error-non.png";

type Props = {
  message?: string | null;
  /** Access denied (403) uses the “no entry” mascot; other load failures stay neutral. */
  accessDenied?: boolean;
};

export default function DeckGateError({ message, accessDenied = false }: Props) {
  const body = message?.trim() || (accessDenied ? "이 세트에 접근할 수 없습니다." : "세트를 열 수 없습니다.");

  if (!accessDenied) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden px-6 py-16 text-[var(--ink)]">
        <div className="animate-fade-up mx-auto flex w-full max-w-md flex-col items-center text-center">
          <img src="/logo.png" alt="" className="h-16 w-16 opacity-90" />
          <h1 className="font-display mt-5 text-[clamp(1.4rem,3.5vw,1.9rem)] font-semibold text-[var(--moss)]">
            세트를 열 수 없어요
          </h1>
          <p className="mt-3 text-[0.95rem] leading-relaxed text-[#8a3b24]">{body}</p>
          <Link
            to="/"
            className="mt-8 rounded-full bg-[var(--moss)] px-6 py-3 text-sm font-semibold text-[var(--sand)] transition hover:bg-[var(--moss-deep)]"
          >
            세트 선택으로
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--moss-deep)] px-6 py-16 text-[var(--sand)]">
      <div
        className="animate-soft-glow pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "rgba(138,59,36,0.28)" }}
      />
      <div
        className="animate-soft-glow pointer-events-none absolute bottom-10 left-8 h-56 w-56 rounded-full blur-3xl"
        style={{ background: "rgba(61,122,92,0.28)", animationDelay: "1s" }}
      />

      <div className="animate-fade-up relative z-10 mx-auto flex w-full max-w-xl flex-col items-center text-center">
        <p className="font-display text-sm font-semibold tracking-[0.28em] text-[var(--gold)]">
          ACCESS DENIED
        </p>
        <img
          src={mascotDenied}
          alt="들어오지 말라는 Patience 마스코트"
          className="animate-mascot-float mt-5 w-[min(88%,340px)] select-none drop-shadow-[0_20px_36px_rgba(0,0,0,0.5)]"
          draggable={false}
        />
        <h1 className="font-display mt-5 text-[clamp(1.7rem,4vw,2.5rem)] font-semibold tracking-[-0.02em]">
          여기는 못 들어가요
        </h1>
        <p className="mt-3 max-w-md text-[0.98rem] leading-relaxed text-[var(--sand)]/70">{body}</p>
        <Link
          to="/"
          className="mt-9 rounded-full bg-[var(--gold)] px-6 py-3 text-sm font-semibold text-[var(--moss-deep)] transition hover:brightness-95"
        >
          세트 선택으로
        </Link>
      </div>
    </main>
  );
}
