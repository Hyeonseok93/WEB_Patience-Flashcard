import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import mascotSignup from "../assets/images/mascot-signup.png";
import { useAuth } from "../auth/auth-context";
import AuthStage from "../components/AuthStage";
import { messageOf } from "../lib/errors";
import { fieldClass } from "../lib/fieldClass";

const field = fieldClass("gold");

export default function SignupPage() {
  const { user, setUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (user) return <Navigate to="/" replace />;

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      const me = await api.signup(username, password);
      setUser(me);
      navigate("/", { replace: true });
    } catch (err) {
      setError(messageOf(err, "회원가입에 실패했습니다."));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthStage
      mascotSrc={mascotSignup}
      mascotAlt="손 흔드는 Patience 마스코트"
      eyebrow="Get started"
      title="함께 키워볼까요"
      subtitle="카드를 담아 둘 내 자리를 만드는 데는 잠깐이면 돼요."
      accent="gold"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-[var(--ink)]/80">
          아이디
          <input
            className={field}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
            minLength={3}
            maxLength={32}
            pattern="[a-zA-Z0-9_]+"
          />
          <span className="mt-1.5 block text-xs font-normal text-[var(--ink)]/45">
            영문·숫자·_ 조합 3–32자
          </span>
        </label>
        <label className="block text-sm font-medium text-[var(--ink)]/80">
          비밀번호
          <input
            type="password"
            className={field}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
            minLength={8}
            maxLength={72}
          />
          <span className="mt-1.5 block text-xs font-normal text-[var(--ink)]/45">
            8자 이상
          </span>
        </label>

        {error && (
          <p className="rounded-2xl bg-[#f8ebe4] px-4 py-3 text-sm text-[#8a3b24]" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 w-full rounded-full bg-[var(--gold)] px-4 py-3.5 text-[0.95rem] font-semibold text-[var(--moss-deep)] transition hover:brightness-95 disabled:opacity-60"
        >
          {pending ? "가입 중…" : "가입하고 시작"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[var(--ink)]/60">
        이미 계정이 있나요?{" "}
        <Link
          className="font-semibold text-[var(--moss)] underline-offset-4 transition hover:underline"
          to="/login"
        >
          로그인
        </Link>
      </p>
    </AuthStage>
  );
}
