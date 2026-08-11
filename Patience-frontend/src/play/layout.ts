/**
 * Card-exit animation duration in ms. MUST stay in sync with `.animate-card-out` in index.css.
 * Also pushed to the DOM as `--exit-ms` so CSS reads the same value.
 */
export const EXIT_MS = 240;
/** Matches `.animate-card-in` (0.34s). */
export const CARD_IN_MS = 340;
/** Matches `.animate-stack-in` (0.36s). */
export const STACK_IN_MS = 360;
export const SAVE_DEBOUNCE_MS = 400;
export const COUNTER_BUMP_MS = 320;
export const SAVE_FAIL_TOAST_GAP_MS = 4000;

export const LAYOUT = {
  smallWidthScale: 0.92,
  smallHeightScale: 0.52,
  largeMarginRight: 0.1,
  smallOverlap: -0.5,
  compactOverlap: -0.38,
  topZ: 50,
} as const;

export type LayoutMode = "classic" | "glance";

export const FOCUS_CARD_ASPECT = "2.05 / 1";
export const FOCUS_CARD_RATIO = 2.05;
export const CLASSIC_CARD_H_RATIO = 1.38;
export const GLANCE_DESKTOP_MQ = "(min-width: 1024px)";

export const LAYOUT_OPTIONS: { id: LayoutMode; label: string }[] = [
  { id: "classic", label: "클래식" },
  { id: "glance", label: "확대" },
];
