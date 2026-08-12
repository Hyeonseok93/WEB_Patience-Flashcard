import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import { EMAIL_MAX, emailInvalidReason, normalizeEmail } from "../auth/emailRules";
import { useAvailableField } from "../auth/useAvailableField";
import {
  USERNAME_MAX,
  normalizeUsername,
  passwordStrength,
  usernameInvalidReason,
} from "../auth/usernameRules";
import { rememberJustJoined } from "../auth/welcome";
import { PasswordMeter } from "./PasswordMeter";
import { fieldClass } from "../lib/fieldClass";
import { messageOf } from "../lib/errors";

export function SignupForm() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [code, setCode] = useState("");
  const [verified, setVerified] = useState(false);
  const [challengeSent, setChallengeSent] = useState(false);
  const [challengePending, setChallengePending] = useState(false);
  const [confirmPending, setConfirmPending] = useState(false);
  const [codeNote, setCodeNote] = useState<string | null>(null);

  const checkUsername = useCallback((value: string) => api.usernameAvailable(value), []);
  const checkEmail = useCallback((value: string) => api.emailAvailable(value), []);
  const nick = useAvailableField(username, normalizeUsername, usernameInvalidReason, checkUsername);
  const mail = useAvailableField(email, normalizeEmail, emailInvalidReason, checkEmail);

  useEffect(() => {
    setVerified(false);
    setCode("");
    setChallengeSent(false);
    setCodeNote(null);
  }, [email]);

  const strength = passwordStrength(password);
  const passwordShort = password.length > 0 && password.length < 8;
  const passwordLong = password.length > 72;
  const confirmMismatch = confirm.length > 0 && confirm !== password;
  const canChallenge = mail.ok && !mail.checking && !challengePending && !verified;
  const canConfirm = challengeSent && !verified && code.length === 6 && !confirmPending;
  const canSubmit =
    nick.ok &&
    mail.ok &&
    verified &&
    !nick.checking &&
    !mail.checking &&
    password.length >= 8 &&
    password.length <= 72 &&
    confirm === password &&
    !pending;

  async function onChallenge() {
    if (!canChallenge) return;
    setChallengePending(true);
    setFormError(null);
    setCodeNote(null);
    try {
      const result = await api.requestEmailCode(normalizeEmail(email));
      setChallengeSent(true);
      setCode("");
      setCodeNote(result.message);
    } catch (err) {
      // Challenge no longer returns 409 for taken emails (enumeration-safe).
      setFormError(messageOf(err, "인증 번호를 보내지 못했어요. 다시 해 주세요."));
    } finally {
      setChallengePending(false);
    }
  }

  async function onConfirm() {
    if (!canConfirm) return;
    setConfirmPending(true);
    setFormError(null);
    try {
      await api.confirmEmailCode(normalizeEmail(email), code);
      setVerified(true);
      setCodeNote("인증 완료");
    } catch (err) {
      setVerified(false);
      setCodeNote(messageOf(err, "인증 번호가 달라요."));
    } finally {
      setConfirmPending(false);
    }
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setFormError(null);
    try {
      const me = await api.signup(normalizeUsername(username), normalizeEmail(email), password);
      setUser(me);
      rememberJustJoined(me.username);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        nick.setOk(false);
        nick.setNote("이미 있는 닉네임이에요");
      } else if (err instanceof ApiError && err.status === 429) {
        setFormError(err.message);
      } else {
        setFormError(messageOf(err, "연결이 불안정해요. 다시 시도해 주세요."));
      }
    } finally {
      setPending(false);
    }
  }

  const nickTone = !username || nick.checking ? "default" : nick.ok ? "ok" : nick.note ? "bad" : "default";
  const mailTone = verified ? "ok" : !email || mail.checking ? "default" : mail.ok ? "ok" : mail.note ? "bad" : "default";
  const passwordTone = passwordShort || passwordLong ? "bad" : "default";
  const confirmTone = confirmMismatch ? "bad" : confirm.length > 0 && confirm === password ? "ok" : "default";

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <label className="block text-sm font-medium text-[var(--ink)]/80">
          닉네임
          <input
            className={`mt-1.5 ${fieldClass("gold", nickTone)}`}
            value={username}
            onChange={(e) => setUsername(normalizeUsername(e.target.value))}
            autoComplete="username"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={USERNAME_MAX}
            aria-invalid={Boolean(username) && !nick.ok}
            aria-describedby="signup-nick-note"
          />
          <span
            id="signup-nick-note"
            className={`mt-1.5 block text-xs font-normal ${fieldNoteClass(nick.ok, nick.checking, nick.note)}`}
          >
            {nick.note ?? "영문 소문자·숫자 조합 3–10자"}
          </span>
        </label>

        <div>
          <label className="block text-sm font-medium text-[var(--ink)]/80">
            이메일
            <div className="mt-1.5 flex gap-2">
              <input
                type="email"
                className={`min-w-0 flex-1 ${fieldClass("gold", mailTone)}`}
                value={email}
                onChange={(e) => setEmail(normalizeEmail(e.target.value))}
                autoComplete="email"
                maxLength={EMAIL_MAX}
                aria-invalid={Boolean(email) && !mail.ok}
                aria-describedby="signup-mail-note"
              />
              <button
                type="button"
                disabled={!canChallenge}
                onClick={() => void onChallenge()}
                className="shrink-0 rounded-full bg-[var(--moss)] px-4 py-2 text-sm font-semibold text-[var(--sand)] transition hover:bg-[var(--moss-deep)] disabled:cursor-not-allowed disabled:bg-[var(--ink)]/10 disabled:text-[var(--ink)]/30 disabled:hover:bg-[var(--ink)]/10"
              >
                {challengePending
                  ? "보내는 중…"
                  : verified
                    ? "인증 완료"
                    : challengeSent
                      ? "다시 보내기"
                      : "인증하기"}
              </button>
            </div>
          </label>
          <span
            id="signup-mail-note"
            className={`mt-1.5 block text-xs font-normal ${fieldNoteClass(mail.ok, mail.checking, mail.note)}`}
          >
            {mail.note ?? "계정 하나당 메일 하나. 인증해야 자리를 만들 수 있어요."}
          </span>
        </div>

        {challengeSent && !verified ? (
          <div>
            <label className="block text-sm font-medium text-[var(--ink)]/80">
              인증 번호
              <div className="mt-1.5 flex gap-2">
                <input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  className={`min-w-0 flex-1 tracking-[0.35em] ${fieldClass("gold", "default")}`}
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  maxLength={6}
                  aria-describedby="signup-code-note"
                />
                <button
                  type="button"
                  disabled={!canConfirm}
                  onClick={() => void onConfirm()}
                  className="shrink-0 rounded-full bg-[var(--gold)] px-4 py-2 text-sm font-semibold text-[var(--moss-deep)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-[var(--ink)]/10 disabled:text-[var(--ink)]/30 disabled:hover:brightness-100"
                >
                  {confirmPending ? "확인 중…" : "확인"}
                </button>
              </div>
            </label>
            <span
              id="signup-code-note"
              className={`mt-1.5 block text-xs font-normal ${codeNote?.includes("달라") || codeNote?.includes("만료") ? "text-[#8a3b24]" : "text-[var(--ink)]/45"}`}
            >
              {codeNote ?? "메일로 받은 6자리를 입력해 주세요."}
            </span>
          </div>
        ) : null}

        {verified ? (
          <p className="text-xs font-medium text-[var(--leaf)]">메일 인증이 완료됐어요.</p>
        ) : null}

        <div className="space-y-3 rounded-3xl bg-[var(--sand)]/35 p-4 ring-1 ring-[var(--mist)]">
          <label className="block text-sm font-medium text-[var(--ink)]/80">
            비밀번호
            <div className="relative mt-1.5">
              <input
                type={showPassword ? "text" : "password"}
                className={`${fieldClass("gold", passwordTone)} pr-12`}
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
            비밀번호 확인
            <input
              type={showPassword ? "text" : "password"}
              className={`mt-1.5 ${fieldClass("gold", confirmTone)}`}
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

        {formError ? (
          <p className="text-xs text-[#8a3b24]" role="alert">
            {formError}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={!canSubmit}
          className="mt-2 w-full rounded-full bg-[var(--gold)] px-4 py-3.5 text-[0.95rem] font-semibold text-[var(--moss-deep)] transition hover:brightness-95 disabled:cursor-not-allowed disabled:bg-[var(--ink)]/10 disabled:text-[var(--ink)]/30 disabled:hover:brightness-100"
        >
          {pending ? "자리 만드는 중…" : "자리 만들기"}
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
    </>
  );
}

function fieldNoteClass(ok: boolean, checking: boolean, note: string | null) {
  if (ok) return "text-[var(--leaf)]";
  if (checking) return "text-[var(--ink)]/45";
  if (note) return "text-[#8a3b24]";
  return "text-[var(--ink)]/45";
}
