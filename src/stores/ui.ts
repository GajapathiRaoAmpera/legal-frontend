import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

export type Theme = "light" | "dark";
export type Density = "comfortable" | "compact";

type UiState = {
  theme: Theme;
  density: Density;
  shortcutsEnabled: boolean;
  setTheme: (t: Theme) => void;
  setDensity: (d: Density) => void;
  setShortcutsEnabled: (on: boolean) => void;
};

const root = () => document.documentElement;

// persisted as separate localStorage keys (ui.theme / ui.density / ui.shortcutsEnabled) per ARCHITECTURE §4
const storage = createJSONStorage<Pick<UiState, "theme" | "density" | "shortcutsEnabled">>(() => ({
  getItem: () =>
    JSON.stringify({
      state: {
        theme: root().dataset.theme === "dark" ? "dark" : "light",
        density: root().dataset.density === "compact" ? "compact" : "comfortable",
        shortcutsEnabled: localStorage.getItem("ui.shortcutsEnabled") !== "false",
      },
    }),
  setItem: (_k, value) => {
    const { state } = JSON.parse(value) as {
      state: Pick<UiState, "theme" | "density" | "shortcutsEnabled">;
    };
    localStorage.setItem("ui.theme", state.theme);
    localStorage.setItem("ui.density", state.density);
    localStorage.setItem("ui.shortcutsEnabled", String(state.shortcutsEnabled));
  },
  removeItem: () => undefined,
}));

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "light",
      density: "comfortable",
      shortcutsEnabled: true,
      setTheme: (theme) => {
        root().dataset.theme = theme;
        set({ theme });
      },
      setDensity: (density) => {
        root().dataset.density = density;
        set({ density });
      },
      setShortcutsEnabled: (shortcutsEnabled) => set({ shortcutsEnabled }),
    }),
    {
      name: "ui",
      storage,
      partialize: ({ theme, density, shortcutsEnabled }) => ({ theme, density, shortcutsEnabled }),
    },
  ),
);

/** Runs before first render (main.tsx) so there is no theme flash and no inline script (CSP). */
export function bootstrapUi(): void {
  const t = localStorage.getItem("ui.theme");
  root().dataset.theme =
    t === "light" || t === "dark"
      ? t
      : matchMedia("(prefers-color-scheme: dark)").matches
        ? "dark"
        : "light";
  root().dataset.density =
    localStorage.getItem("ui.density") === "compact" ? "compact" : "comfortable";
}
