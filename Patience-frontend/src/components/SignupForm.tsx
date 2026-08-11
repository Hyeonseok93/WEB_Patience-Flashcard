import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError, api } from "../api/client";
import { useAuth } from "../auth/auth-context";
import {
  USERNAME_MAX,
  normalizeUsername,
  passwordStrength,
  usernameInvalidReason,
} from "../auth/usernameRules";
import { rememberJustJoined } from "../auth/welcome";
import { fieldClass } from "../lib/fieldClass";
import { messageOf } from "../lib/errors";

const DEBOUNCE_MS = 300;

export function SignupForm() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const [usernameNote, setUsernameNote] = useState<string | null>(null);
  const [usernameOk, setUsernameOk] = useState(false);
  const [checking, setChecking] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const strength = passwordStrength(password);
  const passwordShort = password.length > 0 && password.length < 8;
  const passwordLong = password.length > 72;
  const confirmMismatch = confirm.length > 0 && confirm !== password;
  const canSubmit =
    usernameOk &&
    !checking &&
    password.length >= 8 &&
    password.length <= 72 &&
    confirm === password &&
    !pending;

  useEffect(() => {
    const normalized = normalizeUsername(username);
    const local = usernameInvalidReason(normalized);
    setUsernameOk(false);
    setFormError(null);
    if (!normalized) {
      setUsernameNote(null);
      setChecking(false);
      return;
    }
    if (local) {
      setUsernameNote(local);
      setChecking(false);
      return;
    }

    setChecking(true);
    setUsernameNote("확인 중…");
    const ac = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const result = await api.usernameAvailable(normalized);
        if (ac.signal.aborted) return;
        setUsernameOk(result.available);
        setUsernameNote(result.message);
      } catch (err) {
        if (ac.signal.aborted) return;
        setUsernameOk(false);
        setUsernameNote(
          err instanceof ApiError && err.status === 429
            ? "확인이 잠시 밀렸어요. 조금 뒤에 다시 쳐 보세요."
            : "확인하지 못했어요. 잠시 후 다시 쳐 보세요.",
        );
      } finally {
        if (!ac.signal.aborted) setChecking(false);
      }
    }, DEBOUNCE_MS);

    return () => {
      ac.abort();
      window.clearTimeout(timer);
    };
  }, [username]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setPending(true);
    setFormError(null);
    try {
      const me = await api.signup(normalizeUsername(username), password);
      setUser(me);
      rememberJustJoined(me.username);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setUsernameOk(false);
        setUsernameNote("이미 있어요");
      } else if (err instanceof ApiError && err.status === 429) {
        setFormError(err.message);
      } else {
        setFormError(messageOf(err, "연결이 불안정해요. 다시 시도해 주세요."));
      }
    } finally {
      setPending(false);
    }
  }

  const usernameTone = !username || checking ? "default" : usernameOk ? "ok" : usernameNote ? "bad" : "default";
  const passwordTone = passwordShort || passwordLong ? "bad" : "default";
  const confirmTone = confirmMismatch ? "bad" : confirm.length > 0 && confirm === password ? "ok" : "default";

  return (
    <>
      <form onSubmit={onSubmit} noValidate className="space-y-4">
        <label className="block text-sm font-medium text-[var(--ink)]/80">
          아이디
          <input
            className={`mt-1.5 ${fieldClass("gold", usernameTone)}`}
            value={username}
            onChange={(e) => setUsername(normalizeUsername(e.target.value))}
            autoComplete="username"
            autoCapitalize="off"
            spellCheck={false}
            maxLength={USERNAME_MAX}
            aria-invalid={Boolean(username) && !usernameOk}
            aria-describedby="signup-username-note"
          />
          <span
            id="signup-username-note"
            className={`mt-1.5 block text-xs font-normal ${
              usernameOk
                ? "text-[var(--leaf)]"
                : checking
                  ? "text-[var(--ink)]/45"
                  : usernameNote
                    ? "text-[#8a3b24]"
                    : "text-[var(--ink)]/45"
            }`}
          >
            {usernameNote ?? "영문 소문자·숫자 조합 3–32자"}
          </span>
        </label>

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

function PasswordMeter({ level, label }: { level: 0 | 1 | 2 | 3; label: string }) {
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
