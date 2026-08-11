export const JUST_JOINED_KEY = "patience.justJoined";

export function rememberJustJoined(username: string) {
  sessionStorage.setItem(JUST_JOINED_KEY, username);
}

export function takeJustJoined(): string | null {
  const name = sessionStorage.getItem(JUST_JOINED_KEY);
  if (name) sessionStorage.removeItem(JUST_JOINED_KEY);
  return name;
}
