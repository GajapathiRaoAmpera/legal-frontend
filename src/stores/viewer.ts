import { create } from "zustand";

// UI-only viewer state (never server data). The active clause itself lives in ?clause=.
type ViewerState = {
  highOnly: boolean;
  query: string;
  activeMatch: number;
  toggleHighOnly: () => void;
  setQuery: (q: string) => void;
  setActiveMatch: (i: number) => void;
  reset: () => void;
};

export const useViewerStore = create<ViewerState>()((set) => ({
  highOnly: false,
  query: "",
  activeMatch: 0,
  toggleHighOnly: () => set((s) => ({ highOnly: !s.highOnly })),
  setQuery: (query) => set({ query, activeMatch: 0 }),
  setActiveMatch: (activeMatch) => set({ activeMatch }),
  reset: () => set({ highOnly: false, query: "", activeMatch: 0 }),
}));
