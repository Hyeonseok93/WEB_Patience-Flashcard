export type Levels = Record<number, number[]>;

export const BOTTOM_LIMIT = 3;
export const MIN_LEVELS = 2;
export const MAX_LEVELS = 4;

/** 첫 층=3, 마지막 층=7, 중간 층=5. (2층 [3,7] / 3층 [3,5,7] / 4층 [3,5,5,7]) */
export function limitsFor(levelCount: number): Record<number, number> {
  const m: Record<number, number> = {};
  for (let i = 1; i <= levelCount; i++) {
    m[i] = i === 1 ? BOTTOM_LIMIT : i === levelCount ? 7 : 5;
  }
  return m;
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function emptyLevels(levelCount: number): Levels {
  const levels: Levels = {};
  for (let i = 1; i <= levelCount; i++) levels[i] = [];
  return levels;
}

export function fillLevel1(levels: Levels, queue: number[]): void {
  while (levels[1].length < BOTTOM_LIMIT && queue.length) {
    levels[1].push(queue.shift()!);
  }
}

export function getActiveLevel(levels: Levels, levelCount: number): number {
  let base = 0;
  for (let i = 1; i <= levelCount; i++) {
    if (levels[i].length > 0) {
      base = i;
      break;
    }
  }
  if (base === 0) return 1;

  const limits = limitsFor(levelCount);
  for (let i = base + 1; i <= levelCount; i++) {
    if (levels[i].length >= limits[i]) return i;
  }
  return base;
}

export type GameSnapshot = {
  levelCount: number;
  levels: Levels;
  queue: number[];
  completedCount: number;
};

function clone(snapshot: GameSnapshot): GameSnapshot {
  const levels: Levels = {};
  for (let i = 1; i <= snapshot.levelCount; i++) {
    levels[i] = [...(snapshot.levels[i] ?? [])];
  }
  return {
    levelCount: snapshot.levelCount,
    levels,
    queue: [...snapshot.queue],
    completedCount: snapshot.completedCount,
  };
}

/** `cardId`를 target 층에 넣고, 넘치면 가장 오래된 카드를 위층으로 밀어 올린다(연쇄). 맨 위를 넘어가면 완료 처리. */
function promote(state: GameSnapshot, target: number, cardId: number): void {
  if (target > state.levelCount) {
    state.completedCount += 1;
    return;
  }
  const limits = limitsFor(state.levelCount);
  state.levels[target].push(cardId);
  if (state.levels[target].length > limits[target]) {
    const displaced = state.levels[target].shift()!;
    promote(state, target + 1, displaced);
  }
}

export function moveCard(
  prev: GameSnapshot,
  from: number,
  cardId: number,
  action: "remember" | "forget",
): GameSnapshot {
  const state = clone(prev);
  state.levels[from] = state.levels[from].filter((c) => c !== cardId);

  if (action === "forget") {
    // 중간 층에서 까먹으면 첫 층으로 되돌린다.
    state.levels[1].push(cardId);
    return state;
  }

  // remember: 맨 위 층이면 완료, 아니면 위층으로.
  if (from >= state.levelCount) {
    state.completedCount += 1;
    return state;
  }
  promote(state, from + 1, cardId);
  return state;
}

export function forgetRotateLevel1(prev: GameSnapshot): GameSnapshot {
  const state = clone(prev);
  if (!state.levels[1].length) return state;
  const target = state.levels[1].shift()!;
  state.levels[1].push(target);
  return state;
}

export function pullNextToLevel1(prev: GameSnapshot): GameSnapshot {
  const state = clone(prev);
  if (!state.queue.length) return state;
  state.levels[1].push(state.queue.shift()!);
  return state;
}

export function removeFromTop(prev: GameSnapshot, cardId: number): GameSnapshot {
  const state = clone(prev);
  const top = state.levelCount;
  state.levels[top] = state.levels[top].filter((c) => c !== cardId);
  state.completedCount += 1;
  return state;
}

export function forgetTopToBottom(prev: GameSnapshot, cardId: number): GameSnapshot {
  const state = clone(prev);
  const top = state.levelCount;
  state.levels[top] = state.levels[top].filter((c) => c !== cardId);
  state.levels[1].push(cardId);
  return state;
}

export function totalRemaining(snapshot: GameSnapshot): number {
  let sum = snapshot.queue.length;
  for (let i = 1; i <= snapshot.levelCount; i++) {
    sum += snapshot.levels[i].length;
  }
  return sum;
}

export function totalInHand(snapshot: GameSnapshot): number {
  let sum = 0;
  for (let i = 1; i <= snapshot.levelCount; i++) {
    sum += snapshot.levels[i].length;
  }
  return sum;
}
