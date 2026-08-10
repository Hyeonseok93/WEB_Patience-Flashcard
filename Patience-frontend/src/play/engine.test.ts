import { describe, expect, it } from "vitest";
import {
  emptyLevels,
  fillLevel1,
  forgetRotateLevel1,
  getActiveLevel,
  limitsFor,
  moveCard,
  pullNextToLevel1,
  removeFromTop,
  totalRemaining,
  type GameSnapshot,
} from "./engine";

function snap(partial?: Partial<GameSnapshot>): GameSnapshot {
  const levelCount = partial?.levelCount ?? 3;
  return {
    levelCount,
    levels: partial?.levels ?? emptyLevels(levelCount),
    queue: partial?.queue ?? [],
    completedCount: partial?.completedCount ?? 0,
  };
}

describe("limitsFor", () => {
  it("uses 3 / 5 / 7 for three levels", () => {
    expect(limitsFor(3)).toEqual({ 1: 3, 2: 5, 3: 7 });
  });

  it("uses 3 / 7 for two levels", () => {
    expect(limitsFor(2)).toEqual({ 1: 3, 2: 7 });
  });
});

describe("fillLevel1", () => {
  it("fills up to the bottom limit from the queue", () => {
    const levels = emptyLevels(3);
    const queue = [1, 2, 3, 4];
    fillLevel1(levels, queue);
    expect(levels[1]).toEqual([1, 2, 3]);
    expect(queue).toEqual([4]);
  });
});

describe("moveCard", () => {
  it("promotes on remember and completes from the top", () => {
    const state = snap({
      levels: { 1: [], 2: [], 3: [10] },
      queue: [],
    });
    const next = moveCard(state, 3, 10, "remember");
    expect(next.levels[3]).toEqual([]);
    expect(next.completedCount).toBe(1);
  });

  it("sends middle-layer forgets back to level 1", () => {
    const state = snap({
      levels: { 1: [1], 2: [2], 3: [] },
      queue: [],
    });
    const next = moveCard(state, 2, 2, "forget");
    expect(next.levels[2]).toEqual([]);
    expect(next.levels[1]).toEqual([1, 2]);
  });

  it("does not remove sibling cards with different ids", () => {
    const state = snap({
      levels: { 1: [1, 2], 2: [], 3: [] },
      queue: [],
    });
    const next = moveCard(state, 1, 1, "remember");
    expect(next.levels[1]).toEqual([2]);
    expect(next.levels[2]).toEqual([1]);
  });
});

describe("helpers", () => {
  it("rotates level 1 on forget", () => {
    const next = forgetRotateLevel1(snap({ levels: { 1: [1, 2, 3], 2: [], 3: [] } }));
    expect(next.levels[1]).toEqual([2, 3, 1]);
  });

  it("pulls the next queue card into level 1", () => {
    const next = pullNextToLevel1(
      snap({ levels: { 1: [1], 2: [], 3: [] }, queue: [9, 8] }),
    );
    expect(next.levels[1]).toEqual([1, 9]);
    expect(next.queue).toEqual([8]);
  });

  it("counts remaining across levels and queue", () => {
    const state = snap({
      levels: { 1: [1], 2: [2, 3], 3: [] },
      queue: [4],
      completedCount: 5,
    });
    expect(totalRemaining(state)).toBe(4);
  });

  it("picks the active level from the lowest occupied tier unless capped", () => {
    const levels = { 1: [1], 2: [2, 3, 4, 5, 6], 3: [] };
    expect(getActiveLevel(levels, 3)).toBe(2);
  });

  it("removes from top and increments completed", () => {
    const next = removeFromTop(snap({ levels: { 1: [], 2: [], 3: [7] } }), 7);
    expect(next.levels[3]).toEqual([]);
    expect(next.completedCount).toBe(1);
  });
});
