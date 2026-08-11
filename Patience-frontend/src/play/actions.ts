import {
  BOTTOM_LIMIT,
  forgetRotateLevel1,
  forgetTopToBottom,
  moveCard,
  pullNextToLevel1,
  removeFromTop,
  type GameSnapshot,
} from "./engine";

export type PlayActionKind = "remember" | "forget" | "next";

export type ApplyOptions = {
  animateExit?: boolean;
  reappearAsStack?: number;
};

export type PlayActionResult = {
  next: GameSnapshot;
  options?: ApplyOptions;
};

export function level1Ready(snapshot: GameSnapshot): boolean {
  return snapshot.levels[1].length >= BOTTOM_LIMIT || snapshot.queue.length === 0;
}

export function playAction(
  snapshot: GameSnapshot,
  lv: number,
  cardId: number,
  kind: PlayActionKind,
): PlayActionResult | null {
  const top = snapshot.levelCount;

  if (kind === "next") {
    if (lv !== 1) return null;
    if (snapshot.levels[1].length >= BOTTOM_LIMIT || snapshot.queue.length === 0) return null;
    return { next: pullNextToLevel1(snapshot), options: { animateExit: false } };
  }

  if (lv === 1 && !level1Ready(snapshot)) return null;

  if (kind === "remember") {
    if (lv === 1) return { next: moveCard(snapshot, 1, cardId, "remember") };
    if (lv === top) return { next: removeFromTop(snapshot, cardId) };
    return { next: moveCard(snapshot, lv, cardId, "remember") };
  }

  if (lv === 1) {
    return {
      next: forgetRotateLevel1(snapshot),
      options: { reappearAsStack: cardId },
    };
  }
  if (lv === top) return { next: forgetTopToBottom(snapshot, cardId) };
  return { next: moveCard(snapshot, lv, cardId, "forget") };
}
