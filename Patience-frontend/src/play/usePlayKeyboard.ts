import { useEffect, type Dispatch, type SetStateAction } from "react";
import { playAction, type ApplyOptions } from "./actions";
import { getActiveLevel, totalRemaining, type GameSnapshot } from "./engine";

export function usePlayKeyboard({
  snapshot,
  settingsOpen,
  resetMode,
  exiting,
  setFlipped,
  apply,
}: {
  snapshot: GameSnapshot | null;
  settingsOpen: boolean;
  resetMode: string | null;
  exiting: boolean;
  setFlipped: Dispatch<SetStateAction<boolean>>;
  apply: (
    updater: (prev: GameSnapshot) => GameSnapshot,
    options?: ApplyOptions,
  ) => void;
}) {
  useEffect(() => {
    if (!snapshot || settingsOpen || resetMode !== null) return;
    const current = snapshot;
    if (totalRemaining(current) === 0) return;

    const activeLevel = getActiveLevel(current.levels, current.levelCount);
    const activeId = current.levels[activeLevel][0];
    if (activeId == null) return;

    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        if (!exiting) setFlipped((v) => !v);
        return;
      }
      if (exiting) return;

      const kind =
        e.key === "1" || e.key === "ArrowRight"
          ? "remember"
          : e.key === "2" || e.key === "ArrowLeft"
            ? "forget"
            : e.key === "3" || e.key === "n" || e.key === "N"
              ? "next"
              : null;
      if (!kind) return;
      e.preventDefault();
      const preview = playAction(current, activeLevel, activeId, kind);
      if (!preview) return;
      apply(
        (prev) => playAction(prev, activeLevel, activeId, kind)?.next ?? prev,
        preview.options,
      );
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [snapshot, settingsOpen, resetMode, exiting, setFlipped, apply]);
}
