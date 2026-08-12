import { useState, type FormEvent, type ReactNode } from "react";
import { fieldClass } from "../lib/fieldClass";
import { messageOf } from "../lib/errors";

export function AuthForm({
  accent,
  submitLabel,
  pendingLabel,
  errorFallback,
  usernameHint,
  passwordHint,
  usernameMinLength,
  usernameMaxLength,
  passwordMinLength,
  passwordMaxLength,
  usernamePattern,
  usernameAutoComplete = "username",
  passwordAutoComplete,
  submitClassName,
  footer,
  onSubmit,
}: {
  accent: "leaf" | "gold";
  submitLabel: string;
  pendingLabel: string;
  errorFallback: string;
  usernameHint?: string;
  passwordHint?: string;
  usernameMinLength?: number;
  usernameMaxLength?: number;
  passwordMinLength?: number;
  passwordMaxLength?: number;
  usernamePattern?: string;
  usernameAutoComplete?: string;
  passwordAutoComplete: string;
  submitClassName: string;
  footer: ReactNode;
  onSubmit: (username: string, password: string) => Promise<void>;
}) {
  const field = fieldClass(accent);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onSubmit(username, password);
    } catch (err) {
      setError(messageOf(err, errorFallback));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <label className="block text-sm font-medium text-[var(--ink)]/80">
          닉네임
          <input
            className={`mt-1.5 ${field}`}
            value={username}
            onChange={(e) => setUsername(e.target.value.trim().toLowerCase())}
            autoComplete={usernameAutoComplete}
            required
            minLength={usernameMinLength}
            maxLength={usernameMaxLength}
            pattern={usernamePattern}
          />
          {usernameHint ? (
            <span className="mt-1.5 block text-xs font-normal text-[var(--ink)]/45">
              {usernameHint}
            </span>
          ) : null}
        </label>
        <label className="block text-sm font-medium text-[var(--ink)]/80">
          비밀번호
          <input
            type="password"
            className={`mt-1.5 ${field}`}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={passwordAutoComplete}
            required
            minLength={passwordMinLength}
            maxLength={passwordMaxLength}
          />
          {passwordHint ? (
            <span className="mt-1.5 block text-xs font-normal text-[var(--ink)]/45">
              {passwordHint}
            </span>
          ) : null}
        </label>

        {error && (
          <p className="rounded-2xl bg-[#f8ebe4] px-4 py-3 text-sm text-[#8a3b24]" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={pending}
          className={`mt-2 w-full rounded-full px-4 py-3.5 text-[0.95rem] font-semibold transition disabled:opacity-60 ${submitClassName}`}
        >
          {pending ? pendingLabel : submitLabel}
        </button>
      </form>
      {footer}
    </>
  );
}
