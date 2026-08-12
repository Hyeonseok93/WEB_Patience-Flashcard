export const EMAIL_MAX = 254;

export function normalizeEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

export function emailInvalidReason(normalized: string): string | null {
  if (!normalized) return "이메일을 입력해 주세요.";
  if (normalized.length > EMAIL_MAX) return "이메일이 너무 길어요.";
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/.test(normalized)) {
    return "이메일 형식을 확인해 주세요.";
  }
  return null;
}
