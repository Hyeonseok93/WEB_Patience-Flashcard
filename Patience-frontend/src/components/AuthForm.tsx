import { useState, type FormEvent, type ReactNode } from "react";
import { EMAIL_MAX, normalizeEmail } from "../auth/emailRules";
import { fieldClass } from "../lib/fieldClass";
import { messageOf } from "../lib/errors";

export function AuthForm({
  accent,
  submitLabel,
  pendingLabel,
  errorFallback,
  passwordMaxLength,
  passwordAutoComplete,
  submitClassName,
  footer,
  onSubmit,
}: {
  accent: "leaf" | "gold";
  submitLabel: string;
  pendingLabel: string;
  errorFallback: string;
  passwordMaxLength?: number;
  passwordAutoComplete: string;
  submitClassName: string;
  footer: ReactNode;
  onSubmit: (email: string, password: string) => Promise<void>;
}) {
  const field = fieldClass(accent);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    try {
      await onSubmit(normalizeEmail(email), password);
    } catch (err) {
      setError(messageOf(err, errorFallback));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <label className="block text-sm font-medium text-[var(--ink)]/80">
          이메일
          <input
            type="email"
            className={`mt-1.5 ${field}`}
            value={email}
            onChange={(e) => setEmail(normalizeEmail(e.target.value))}
            autoComplete="email"
            required
            maxLength={EMAIL_MAX}
          />
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
            maxLength={passwordMaxLength}
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
          className={`mt-2 w-full rounded-full px-4 py-3.5 text-[0.95rem] font-semibold transition disabled:opacity-60 ${submitClassName}`}
        >
          {pending ? pendingLabel : submitLabel}
        </button>
      </form>
      {footer}
    </>
  );
}
