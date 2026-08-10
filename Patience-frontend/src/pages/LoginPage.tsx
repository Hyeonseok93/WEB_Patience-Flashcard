import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { api } from "../api/client";
import mascotLogin from "../assets/images/mascot-login.png";
import { useAuth } from "../auth/auth-context";
import AuthStage from "../components/AuthStage";
import { messageOf } from "../lib/errors";
import { fieldClass } from "../lib/fieldClass";

const field = fieldClass("leaf");

export default function LoginPage() {
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
      const me = await api.login(username, password);
      setUser(me);
      navigate("/", { replace: true });
    } catch (err) {
      setError(messageOf(err, "로그인에 실패했습니다."));
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthStage
      mascotSrc={mascotLogin}
      mascotAlt="물을 주는 Patience 마스코트"
      eyebrow="Welcome back"
      title="다시 만나서 반가워요"
      subtitle="멈춰 둔 그 자리에서 그대로 이어서 시작해요."
      accent="moss"
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
          />
        </label>
        <label className="block text-sm font-medium text-[var(--ink)]/80">
          비밀번호
          <input
            type="password"
            className={field}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>

        {error && (
          <p className="rounded-2xl bg-[#f8ebe4] px-4 py-3 text-sm text-[#8a3b24]" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className="mt-2 w-full rounded-full bg-[var(--moss)] px-4 py-3.5 text-[0.95rem] font-semibold text-[var(--sand)] transition hover:bg-[var(--moss-deep)] disabled:opacity-60"
        >
          {pending ? "확인 중…" : "로그인"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[var(--ink)]/60">
        계정이 없나요?{" "}
        <Link
          className="font-semibold text-[var(--moss)] underline-offset-4 transition hover:underline"
          to="/signup"
        >
          회원가입
        </Link>
      </p>
    </AuthStage>
  );
}
