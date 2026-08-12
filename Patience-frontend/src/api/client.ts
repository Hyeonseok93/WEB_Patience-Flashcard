export type User = {
  id: number;
  username: string;
  email: string;
  // 공개 후 미인증 계정을 다시 허용할 때:
  // emailVerified: boolean;
};

export type DeckSourceType = "BUILTIN" | "USER";

export type DeckSummary = {
  id: number;
  name: string;
  sourceType: DeckSourceType;
  cardCount: number;
  studyLevels: number | null;
  updatedAt: string;
};

export type CardItem = {
  id: number;
  front: string;
  back: string;
  sortOrder: number;
};

export type DeckDetail = {
  id: number;
  name: string;
  sourceType: DeckSourceType;
  cards: CardItem[];
};

export type ProgressBody = {
  levelsJson: string;
  queueJson: string;
  completedCount: number;
};

export type ProgressPayload = {
  deckId: number;
  levelsJson: string;
  queueJson: string;
  completedCount: number;
  exists: boolean;
};

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

let unauthorizedHandler: (() => void) | null = null;

/** Register a global handler invoked whenever any request returns 401 (e.g. expired session). */
export function setUnauthorizedHandler(fn: (() => void) | null) {
  unauthorizedHandler = fn;
}

async function parseError(res: Response): Promise<ApiError> {
  try {
    const data = (await res.json()) as { message?: string };
    return new ApiError(res.status, data.message ?? "요청에 실패했습니다.");
  } catch {
    return new ApiError(res.status, "요청에 실패했습니다.");
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });
  if (!res.ok) {
    if (res.status === 401) {
      unauthorizedHandler?.();
    }
    throw await parseError(res);
  }
  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}

export const api = {
  me: () => request<User>("/api/auth/me"),
  usernameAvailable: (username: string) =>
    request<{ username: string; available: boolean; message: string }>(
      `/api/auth/username-available?username=${encodeURIComponent(username)}`,
    ),
  emailAvailable: (email: string) =>
    request<{ email: string; available: boolean; message: string }>(
      `/api/auth/email-available?email=${encodeURIComponent(email)}`,
    ),
  requestEmailCode: (email: string) =>
    request<{ message: string }>("/api/auth/email-challenge", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  confirmEmailCode: (email: string, code: string) =>
    request<{ message: string }>("/api/auth/email-confirm", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    }),
  signup: (username: string, email: string, password: string) =>
    request<User>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify({ username, email, password }),
    }),
  login: (email: string, password: string) =>
    request<User>("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),
  requestPasswordReset: (email: string) =>
    request<{ message: string }>("/api/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    }),
  resetPassword: (email: string, code: string, password: string) =>
    request<{ message: string }>("/api/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ email, code, password }),
    }),
  logout: () => request<void>("/api/auth/logout", { method: "POST" }),
  builtinDecks: () => request<DeckSummary[]>("/api/decks/builtin"),
  myDecks: () => request<DeckSummary[]>("/api/decks/mine"),
  deckDetail: (deckId: number) => request<DeckDetail>(`/api/decks/${deckId}`),
  importDeck: (file: File, name?: string) => {
    const form = new FormData();
    form.append("file", file);
    if (name?.trim()) form.append("name", name.trim());
    return request<DeckSummary>("/api/decks/import", { method: "POST", body: form });
  },
  renameDeck: (deckId: number, name: string) =>
    request<DeckSummary>(`/api/decks/${deckId}/name`, {
      method: "PUT",
      body: JSON.stringify({ name }),
    }),
  replaceDeckImport: (deckId: number, file: File) => {
    const form = new FormData();
    form.append("file", file);
    return request<DeckSummary>(`/api/decks/${deckId}/import`, { method: "PUT", body: form });
  },
  addCard: (deckId: number, front: string, back: string) =>
    request<CardItem>(`/api/decks/${deckId}/cards`, {
      method: "POST",
      body: JSON.stringify({ front, back }),
    }),
  updateCard: (deckId: number, cardId: number, front: string, back: string) =>
    request<CardItem>(`/api/decks/${deckId}/cards/${cardId}`, {
      method: "PUT",
      body: JSON.stringify({ front, back }),
    }),
  deleteCard: (deckId: number, cardId: number) =>
    request<void>(`/api/decks/${deckId}/cards/${cardId}`, { method: "DELETE" }),
  deleteDeck: (deckId: number) =>
    request<void>(`/api/decks/${deckId}`, { method: "DELETE" }),
  getProgress: (deckId: number) =>
    request<ProgressPayload>(`/api/decks/${deckId}/progress`),
  saveProgress: (deckId: number, body: ProgressBody) =>
    request<ProgressPayload>(`/api/decks/${deckId}/progress`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  /**
   * Best-effort save that survives page unload / navigation via `keepalive`. Used to flush the
   * last move when the user leaves the play screen before the debounced save fires.
   */
  saveProgressBeacon: (deckId: number, body: ProgressBody) => {
    try {
      void fetch(`/api/decks/${deckId}/progress`, {
        method: "PUT",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        keepalive: true,
      });
    } catch {
      // best-effort only
    }
  },
  resetProgress: (deckId: number) =>
    request<void>(`/api/decks/${deckId}/progress`, { method: "DELETE" }),
};
