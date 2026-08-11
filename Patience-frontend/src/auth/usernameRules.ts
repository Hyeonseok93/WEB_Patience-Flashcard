const RESERVED = new Set([
  "admin",
  "administrator",
  "root",
  "system",
  "support",
  "help",
  "moderator",
  "official",
  "patience",
  "api",
  "me",
  "null",
  "undefined",
  "owner",
  "staff",
  "security",
  "login",
  "signup",
  "auth",
]);

export const USERNAME_MIN = 3;
export const USERNAME_MAX = 32;

export function normalizeUsername(raw: string): string {
  return raw.trim().toLowerCase();
}

/** Korean reason if invalid, otherwise null. Keep in sync with UsernameRules.java. */
export function usernameInvalidReason(normalized: string): string | null {
  if (!normalized) return "아이디를 입력해 주세요.";
  if (!/^[a-z0-9]+$/.test(normalized)) return "영문 소문자와 숫자만 쓸 수 있어요.";
  if (normalized.length < USERNAME_MIN) return "아이디는 3자 이상이어야 해요.";
  if (normalized.length > USERNAME_MAX) return "아이디는 32자까지예요.";
  if (RESERVED.has(normalized)) return "이 아이디는 쓸 수 없어요.";
  return null;
}

export function passwordStrength(password: string): { level: 0 | 1 | 2 | 3; label: string } {
  if (!password) return { level: 0, label: "" };
  if (password.length < 8) return { level: 1, label: "약함" };
  const classes =
    Number(/[a-zA-Z]/.test(password)) +
    Number(/\d/.test(password)) +
    Number(/[^a-zA-Z0-9]/.test(password));
  if (password.length >= 10 && classes >= 2) return { level: 3, label: "든든함" };
  if (classes >= 2 || password.length >= 10) return { level: 2, label: "괜찮음" };
  return { level: 1, label: "약함" };
}
