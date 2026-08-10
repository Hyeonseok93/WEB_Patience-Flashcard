import { Link } from "react-router-dom";
import mascot404 from "../assets/images/mascot-error-404.png";
import mascotForbidden from "../assets/images/mascot-error-forbidden.png";
import mascotServer from "../assets/images/mascot-error-server.png";

export type ErrorKind = "not-found" | "forbidden" | "server";

const COPY: Record<
  ErrorKind,
  { code: string; title: string; body: string; image: string; alt: string }
> = {
  "not-found": {
    code: "404",
    title: "길을 잃었어요",
    body: "찾으신 페이지는 아직 싹이 트지 않았거나, 옮겨졌을 수 있어요.",
    image: mascot404,
    alt: "어지러운 Patience 마스코트",
  },
  forbidden: {
    code: "403",
    title: "여긴 안 돼요",
    body: "이 정원에는 들어갈 수 없어요. 권한이 필요하거나 잘못된 경로입니다.",
    image: mascotForbidden,
    alt: "출입을 막는 Patience 마스코트",
  },
  server: {
    code: "500",
    title: "잠깐, 숨 고르는 중",
    body: "서버가 잠시 삐걱거리고 있어요. 조금 뒤에 다시 시도해 주세요.",
    image: mascotServer,
    alt: "화난 Patience 마스코트",
  },
};

export default function ErrorPage({ kind = "not-found" }: { kind?: ErrorKind }) {
  const copy = COPY[kind];

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--moss-deep)] px-6 py-16 text-[var(--sand)]">
      <div
        className="animate-soft-glow pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 rounded-full blur-3xl"
        style={{ background: "rgba(61,122,92,0.35)" }}
      />
      <div
        className="animate-soft-glow pointer-events-none absolute bottom-10 right-10 h-56 w-56 rounded-full blur-3xl"
        style={{ background: "rgba(212,162,74,0.22)", animationDelay: "1s" }}
      />

      <div className="animate-fade-up relative z-10 mx-auto flex w-full max-w-xl flex-col items-center text-center">
        <p className="font-display text-sm font-semibold tracking-[0.28em] text-[var(--gold)]">
          ERROR {copy.code}
        </p>
        <img
          src={copy.image}
          alt={copy.alt}
          className="animate-mascot-float mt-6 w-[min(78%,300px)] select-none drop-shadow-[0_20px_36px_rgba(0,0,0,0.5)]"
          draggable={false}
        />
        <h1 className="font-display mt-6 text-[clamp(1.8rem,4vw,2.6rem)] font-semibold tracking-[-0.02em]">
          {copy.title}
        </h1>
        <p className="mt-3 max-w-md text-[0.98rem] leading-relaxed text-[var(--sand)]/70">{copy.body}</p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/"
            className="rounded-full bg-[var(--gold)] px-6 py-3 text-sm font-semibold text-[var(--moss-deep)] transition hover:brightness-95"
          >
            홈으로
          </Link>
          <Link
            to="/login"
            className="rounded-full border border-[var(--sand)]/25 px-6 py-3 text-sm font-semibold text-[var(--sand)] transition hover:bg-white/5"
          >
            로그인
          </Link>
        </div>
      </div>
    </main>
  );
}
