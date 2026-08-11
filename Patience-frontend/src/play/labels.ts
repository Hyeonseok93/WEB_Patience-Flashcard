export function levelLabel(level: number, levelCount: number): string {
  if (level === 1) return "지금 보는 카드";
  if (level === levelCount) return "거의 외웠어요";
  return "익숙해지는 중";
}
