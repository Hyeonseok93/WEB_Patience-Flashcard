import { describe, expect, it } from "vitest";
import { buildCardLookup, buildFromSaved, buildFresh } from "./progressCodec";

const cards = [
  { id: 11, front: "あ", back: "a" },
  { id: 12, front: "い", back: "i" },
  { id: 13, front: "う", back: "u" },
];

describe("buildFromSaved", () => {
  it("loads card-id based progress", () => {
    const lookup = buildCardLookup(cards);
    const snap = buildFromSaved(
      {
        deckId: 1,
        levelsJson: JSON.stringify({ 1: [11], 2: [12], 3: [] }),
        queueJson: JSON.stringify([13]),
        completedCount: 2,
        exists: true,
      },
      lookup,
    );
    expect(snap).not.toBeNull();
    // fillLevel1 tops up level 1 from the queue when under the bottom limit.
    expect(snap!.levels[1]).toEqual([11, 13]);
    expect(snap!.levels[2]).toEqual([12]);
    expect(snap!.queue).toEqual([]);
    expect(snap!.completedCount).toBe(2);
  });

  it("migrates legacy front-text progress to ids", () => {
    const lookup = buildCardLookup(cards);
    const snap = buildFromSaved(
      {
        deckId: 1,
        levelsJson: JSON.stringify({ 1: ["あ", "い"], 2: [], 3: [] }),
        queueJson: JSON.stringify(["う"]),
        completedCount: 0,
        exists: true,
      },
      lookup,
    );
    expect(snap).not.toBeNull();
    expect(snap!.levels[1]).toEqual([11, 12, 13]);
    expect(snap!.queue).toEqual([]);
  });

  it("returns null for unknown ids", () => {
    const lookup = buildCardLookup(cards);
    const snap = buildFromSaved(
      {
        deckId: 1,
        levelsJson: JSON.stringify({ 1: [999], 2: [], 3: [] }),
        queueJson: "[]",
        completedCount: 0,
        exists: true,
      },
      lookup,
    );
    expect(snap).toBeNull();
  });
});

describe("buildFresh", () => {
  it("keeps order when not shuffling", () => {
    const snap = buildFresh([1, 2, 3, 4], "order", 3, (a) => [...a].reverse());
    expect(snap.levels[1]).toEqual([1, 2, 3]);
    expect(snap.queue).toEqual([4]);
  });
});
