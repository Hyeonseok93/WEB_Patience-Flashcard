import type { ProgressPayload } from "../api/client";
import {
  emptyLevels,
  fillLevel1,
  MAX_LEVELS,
  MIN_LEVELS,
  type GameSnapshot,
} from "./engine";

export const DEFAULT_LEVEL_COUNT = 3;

export type CardLookup = {
  ids: number[];
  byId: Map<number, { front: string; back: string }>;
  byFront: Map<string, number>;
};

export function buildCardLookup(
  cards: { id: number; front: string; back: string }[],
): CardLookup {
  const byId = new Map<number, { front: string; back: string }>();
  const byFront = new Map<string, number>();
  const ids: number[] = [];
  for (const c of cards) {
    ids.push(c.id);
    byId.set(c.id, { front: c.front, back: c.back });
    if (!byFront.has(c.front)) byFront.set(c.front, c.id);
  }
  return { ids, byId, byFront };
}

function resolveEntry(raw: unknown, lookup: CardLookup): number | null {
  if (typeof raw === "number" && Number.isFinite(raw) && lookup.byId.has(raw)) {
    return raw;
  }
  if (typeof raw === "string") {
    if (/^\d+$/.test(raw)) {
      const id = Number(raw);
      if (lookup.byId.has(id)) return id;
    }
    const id = lookup.byFront.get(raw);
    if (id != null) return id;
  }
  return null;
}

function resolveIdList(raw: unknown, lookup: CardLookup, seen: Set<number>): number[] | null {
  if (!Array.isArray(raw)) return null;
  const out: number[] = [];
  for (const entry of raw) {
    const id = resolveEntry(entry, lookup);
    if (id == null || seen.has(id)) return null;
    seen.add(id);
    out.push(id);
  }
  return out;
}

/** Build a snapshot from saved progress. Returns null if the payload cannot be reconciled. */
export function buildFromSaved(
  progress: ProgressPayload,
  lookup: CardLookup,
): GameSnapshot | null {
  let saved: Record<string, unknown>;
  let queueRaw: unknown;
  try {
    saved = JSON.parse(progress.levelsJson) as Record<string, unknown>;
    queueRaw = JSON.parse(progress.queueJson);
  } catch {
    return null;
  }

  const savedCount = Object.keys(saved).length || DEFAULT_LEVEL_COUNT;
  const levelCount =
    savedCount >= MIN_LEVELS && savedCount <= MAX_LEVELS ? savedCount : DEFAULT_LEVEL_COUNT;

  const seen = new Set<number>();
  const levels = emptyLevels(levelCount);
  for (let i = 1; i <= levelCount; i++) {
    const resolved = resolveIdList(saved[String(i)], lookup, seen);
    if (resolved == null) return null;
    levels[i] = resolved;
  }
  const queue = resolveIdList(queueRaw, lookup, seen);
  if (queue == null) return null;

  const next: GameSnapshot = {
    levelCount,
    levels,
    queue,
    completedCount: progress.completedCount,
  };
  fillLevel1(next.levels, next.queue);
  return next;
}

export function buildFresh(
  cardIds: number[],
  mode: "shuffle" | "order",
  levelCount: number,
  shuffleFn: <T>(arr: T[]) => T[],
): GameSnapshot {
  const queue = mode === "shuffle" ? shuffleFn(cardIds) : [...cardIds];
  const levels = emptyLevels(levelCount);
  fillLevel1(levels, queue);
  return { levelCount, levels, queue, completedCount: 0 };
}

export function toPayload(s: GameSnapshot) {
  return {
    levelsJson: JSON.stringify(s.levels),
    queueJson: JSON.stringify(s.queue),
    completedCount: s.completedCount,
  };
}
