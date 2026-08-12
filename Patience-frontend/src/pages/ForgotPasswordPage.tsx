import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { ApiError, api } from "../api/client";
import mascotLogin from "../assets/images/mascot-login.png";
import { useAuth } from "../auth/auth-context";
import { EMAIL_MAX, emailInvalidReason, normalizeEmail } from "../auth/emailRules";
import { passwordStrength } from "../auth/usernameRules";
import AuthStage from "../components/AuthStage";
import { PasswordMeter } from "../components/PasswordMeter";
import { fieldClass } from "../lib/fieldClass";
import { messageOf } from "../lib/errors";

export default function ForgotPasswordPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [challengeSent, setChallengeSent] = useState(false);
  const [challengePending, setChallengePending] = useState(false);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="grid min-h-dvh place-items-center bg-[var(--cream)] text-sm text-[var(--ink)]/50">
        확인 중…
      </div>
    );
  }
  if (user) return <Navigate to="/" replace />;

  const emailOk = !emailInvalidReason(normalizeEmail(email));
  const strength = passwordStrength(password);
  const passwordShort = password.length > 0 && password.length < 8;
  const passwordLong = password.length > 72;
  const confirmMismatch = confirm.length > 0 && confirm !== password;
  const canSubmit =
    emailOk &&
    challengeSent &&
    code.length === 6 &&
    password.length >= 8 &&
    password.length <= 72 &&
    confirm === password &&
    !pending;
  const passwordTone = passwordShort || passwordLong ? "bad" : "default";
  const confirmTone = confirmMismatch ? "bad" : confirm.length > 0 && confirm === password ? "ok" : "default";

  async function onChallenge() {
    if (!emailOk || challengePending) return;
    setChallengePending(true);
    setError(null);
    setNote(null);
    try {
      const result = await api.requestPasswordReset(normalizeEmail(email));
      setChallengeSent(true);
      setCode("");
      setNote(result.message);
    } catch (err) {
      setError(messageOf(err, "인증 번호를 보내지 못했어요. 다시 해 주세요."));
    } finally {
      setChallengePending(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setError(null);
    try {
      const result = await api.resetPassword(normalizeEmail(email), code, password);
      navigate("/login", { replace: true, state: { notice: result.message } });
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) {
        setError(err.message);
      } else {
        setError(messageOf(err, "비밀번호를 바꾸지 못했어요. 다시 해 주세요."));
      }
    } finally {
      setPending(false);
    }
  }

  return (
    <AuthStage
      mascotSrc={mascotLogin}
      mascotAlt="물을 주는 Patience 마스코트"
      eyebrow="Reset"
      title="비밀번호를 바꿔 볼까요"
      subtitle="가입한 메일로 인증 번호를 보내 드려요."
      accent="moss"
    >
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <label className="block text-sm font-medium text-[var(--ink)]/80">
          이메일
          <div className="mt-1.5 flex gap-2">
            <input
              type="email"
              className={`min-w-0 flex-1 ${fieldClass("leaf")}`}
              value={email}
              onChange={(e) => {
                setEmail(normalizeEmail(e.target.value));
                setChallengeSent(false);
                setCode("");
                setNote(null);
              }}
              autoComplete="email"
              maxLength={EMAIL_MAX}
            />
            <button
              type="button"
              disabled={!emailOk || challengePending}
              onClick={() => void onChallenge()}
              className="shrink-0 rounded-full bg-[var(--moss)] px-4 py-2 text-sm font-semibold text-[var(--sand)] transition hover:bg-[var(--moss-deep)] disabled:cursor-not-allowed disabled:bg-[var(--ink)]/10 disabled:text-[var(--ink)]/30"
            >
              {challengePending ? "보내는 중…" : challengeSent ? "다시 보내기" : "인증하기"}
            </button>
          </div>
        </label>

        {challengeSent ? (
          <label className="block text-sm font-medium text-[var(--ink)]/80">
            인증 번호
            <input
              inputMode="numeric"
              autoComplete="one-time-code"
              className={`mt-1.5 tracking-[0.35em] ${fieldClass("leaf")}`}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
              maxLength={6}
            />
            {note ? <span className="mt-1.5 block text-xs font-normal text-[var(--ink)]/45">{note}</span> : null}
          </label>
        ) : null}

        <div className="space-y-3 rounded-3xl bg-[var(--sand)]/35 p-4 ring-1 ring-[var(--mist)]">
          <label className="block text-sm font-medium text-[var(--ink)]/80">
            새 비밀번호
            <div className="relative mt-1.5">
              <input
                type={showPassword ? "text" : "password"}
                className={`${fieldClass("leaf", passwordTone)} pr-12`}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyUp={(e) => setCapsOn(e.getModifierState("CapsLock"))}
                onKeyDown={(e) => setCapsOn(e.getModifierState("CapsLock"))}
                autoComplete="new-password"
                maxLength={72}
                aria-invalid={passwordShort || passwordLong}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-3 text-[0.7rem] font-semibold text-[var(--ink)]/45 hover:text-[var(--ink)]/70"
                aria-label={showPassword ? "비밀번호 숨기기" : "비밀번호 보기"}
              >
                {showPassword ? "숨김" : "보기"}
              </button>
            </div>
          </label>

          <label className="block text-sm font-medium text-[var(--ink)]/80">
            새 비밀번호 확인
            <input
              type={showPassword ? "text" : "password"}
              className={`mt-1.5 ${fieldClass("leaf", confirmTone)}`}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              onKeyUp={(e) => setCapsOn(e.getModifierState("CapsLock"))}
              onKeyDown={(e) => setCapsOn(e.getModifierState("CapsLock"))}
              autoComplete="new-password"
              maxLength={72}
              aria-invalid={confirmMismatch}
            />
          </label>

          <PasswordMeter level={strength.level} label={strength.label} />

          {passwordShort ? (
            <p className="text-xs text-[#8a3b24]">비밀번호는 8자 이상이어야 해요.</p>
          ) : null}
          {confirmMismatch ? (
            <p className="text-xs text-[#8a3b24]">비밀번호가 서로 달라요.</p>
          ) : null}
          {capsOn ? <p className="text-xs text-[var(--ink)]/50">Caps Lock이 켜져 있어요.</p> : null}
        </div>

        {error ? (
          <p className="text-xs text-[#8a3b24]" role="alert">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-2 w-full rounded-full bg-[var(--moss)] px-4 py-3.5 text-[0.95rem] font-semibold text-[var(--sand)] transition hover:bg-[var(--moss-deep)] disabled:cursor-not-allowed disabled:bg-[var(--ink)]/10 disabled:text-[var(--ink)]/30"
        >
          {pending ? "바꾸는 중…" : "비밀번호 바꾸기"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-[var(--ink)]/60">
        <Link
          className="font-semibold text-[var(--moss)] underline-offset-4 transition hover:underline"
          to="/login"
        >
          로그인으로
        </Link>
      </p>
    </AuthStage>
  );
}
