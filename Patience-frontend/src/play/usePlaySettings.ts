import { useEffect, useState } from "react";
import type { LayoutMode } from "./layout";

const STORAGE_KEY = "patience.playSettings";

export type PlaySettings = {
  fontSize: number;
  widthScale: number;
  heightScale: number;
  focusSizeScale: number;
  focusWidthScale: number;
  frontColor: string;
  backColor: string;
  frontTextColor: string;
  backTextColor: string;
  layoutMode: LayoutMode;
};

export const DEFAULT_PLAY_SETTINGS: PlaySettings = {
  fontSize: 22,
  widthScale: 2.2,
  heightScale: 1,
  focusSizeScale: 0.82,
  focusWidthScale: 1,
  frontColor: "#faf6ee",
  backColor: "#ffffff",
  frontTextColor: "#15261f",
  backTextColor: "#1f4a3a",
  layoutMode: "classic",
};

function loadSettings(): PlaySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_PLAY_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<PlaySettings>;
    return {
      ...DEFAULT_PLAY_SETTINGS,
      ...parsed,
      layoutMode: parsed.layoutMode === "glance" ? "glance" : "classic",
    };
  } catch {
    return { ...DEFAULT_PLAY_SETTINGS };
  }
}

export function usePlaySettings() {
  const [settings, setSettings] = useState<PlaySettings>(() => loadSettings());

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
    } catch {
      // ignore quota / private mode
    }
  }, [settings]);

  return {
    settings,
    setFontSize: (fontSize: number) => setSettings((s) => ({ ...s, fontSize })),
    setWidthScale: (widthScale: number) => setSettings((s) => ({ ...s, widthScale })),
    setHeightScale: (heightScale: number) => setSettings((s) => ({ ...s, heightScale })),
    setFocusSizeScale: (focusSizeScale: number) => setSettings((s) => ({ ...s, focusSizeScale })),
    setFocusWidthScale: (focusWidthScale: number) =>
      setSettings((s) => ({ ...s, focusWidthScale })),
    setFrontColor: (frontColor: string) => setSettings((s) => ({ ...s, frontColor })),
    setBackColor: (backColor: string) => setSettings((s) => ({ ...s, backColor })),
    setFrontTextColor: (frontTextColor: string) => setSettings((s) => ({ ...s, frontTextColor })),
    setBackTextColor: (backTextColor: string) => setSettings((s) => ({ ...s, backTextColor })),
    setLayoutMode: (layoutMode: LayoutMode) => setSettings((s) => ({ ...s, layoutMode })),
  };
}
