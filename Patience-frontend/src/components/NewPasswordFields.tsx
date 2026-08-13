import { useState } from "react";
import { passwordStrength } from "../auth/usernameRules";
import { fieldClass } from "../lib/fieldClass";
import { PasswordMeter } from "./PasswordMeter";

type Accent = "gold" | "leaf";

type Props = {
  accent?: Accent;
  password: string;
  confirm: string;
  onPasswordChange: (value: string) => void;
  onConfirmChange: (value: string) => void;
  passwordLabel?: string;
  confirmLabel?: string;
};

/** Shared new-password + confirm fields (signup / reset). */
export function NewPasswordFields({
  accent = "gold",
  password,
  confirm,
  onPasswordChange,
  onConfirmChange,
  passwordLabel = "비밀번호",
  confirmLabel = "비밀번호 확인",
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [capsOn, setCapsOn] = useState(false);
  const strength = passwordStrength(password);
  const passwordShort = password.length > 0 && password.length < 8;
  const confirmMismatch = confirm.length > 0 && confirm !== password;
  const passwordTone = passwordShort ? "bad" : "default";
  const confirmTone =
    confirmMismatch ? "bad" : confirm.length > 0 && confirm === password ? "ok" : "default";

  return (
    <div className="space-y-3 rounded-3xl bg-[var(--sand)]/35 p-4 ring-1 ring-[var(--mist)]">
      <label className="block text-sm font-medium text-[var(--ink)]/80">
        {passwordLabel}
        <div className="relative mt-1.5">
          <input
            type={showPassword ? "text" : "password"}
            className={`${fieldClass(accent, passwordTone)} pr-12`}
            value={password}
            onChange={(e) => onPasswordChange(e.target.value)}
            onKeyUp={(e) => setCapsOn(e.getModifierState("CapsLock"))}
            onKeyDown={(e) => setCapsOn(e.getModifierState("CapsLock"))}
            autoComplete="new-password"
            maxLength={72}
            aria-invalid={passwordShort}
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
        {confirmLabel}
        <input
          type={showPassword ? "text" : "password"}
          className={`mt-1.5 ${fieldClass(accent, confirmTone)}`}
          value={confirm}
          onChange={(e) => onConfirmChange(e.target.value)}
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
  );
}
