import { describe, expect, it } from "vitest";
import { playAction } from "./actions";
import { emptyLevels, type GameSnapshot } from "./engine";

function snap(partial?: Partial<GameSnapshot>): GameSnapshot {
  const levelCount = partial?.levelCount ?? 3;
  return {
    levelCount,
    levels: partial?.levels ?? emptyLevels(levelCount),
    queue: partial?.queue ?? [],
    completedCount: partial?.completedCount ?? 0,
  };
}

describe("playAction", () => {
  it("blocks remember on level 1 until the floor is ready", () => {
    const s = snap({ levels: { 1: [1], 2: [], 3: [] }, queue: [2, 3] });
    expect(playAction(s, 1, 1, "remember")).toBeNull();
  });

  it("remembers from a ready level 1", () => {
    const s = snap({ levels: { 1: [1, 2, 3], 2: [], 3: [] }, queue: [] });
    const result = playAction(s, 1, 1, "remember");
    expect(result?.next.levels[1][0]).toBe(2);
    expect(result?.next.levels[2]).toEqual([1]);
  });

  it("rotates forget on level 1 and asks for stack-in", () => {
    const s = snap({ levels: { 1: [1, 2, 3], 2: [], 3: [] }, queue: [] });
    const result = playAction(s, 1, 1, "forget");
    expect(result?.options?.reappearAsStack).toBe(1);
    expect(result?.next.levels[1][0]).toBe(2);
    expect(result?.next.levels[1].at(-1)).toBe(1);
  });

  it("clears the top floor on remember", () => {
    const s = snap({ levels: { 1: [], 2: [], 3: [9] }, queue: [] });
    const result = playAction(s, 3, 9, "remember");
    expect(result?.next.levels[3]).toEqual([]);
    expect(result?.next.completedCount).toBe(1);
  });

  it("pulls next without an exit animation", () => {
    const s = snap({ levels: { 1: [1], 2: [], 3: [] }, queue: [4] });
    const result = playAction(s, 1, 1, "next");
    expect(result?.options?.animateExit).toBe(false);
    expect(result?.next.levels[1]).toEqual([1, 4]);
  });
});
