import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

type Draft = { text: string; baseUpdatedAt: string };
type DraftsState = {
  drafts: Record<string, Draft>;
  setDraft: (id: string, text: string, baseUpdatedAt: string) => void;
  clearDraft: (id: string) => void;
  clearAll: () => void;
};

export const useDraftsStore = create<DraftsState>()(
  persist(
    (set) => ({
      drafts: {},
      setDraft: (id, text, baseUpdatedAt) =>
        set((s) => ({ drafts: { ...s.drafts, [id]: { text, baseUpdatedAt } } })),
      clearDraft: (id) =>
        set((s) => {
          const rest = { ...s.drafts };
          // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- record keyed by redline id
          delete rest[id];
          return { drafts: rest };
        }),
      clearAll: () => set({ drafts: {} }),
    }),
    { name: "drafts.redlines", storage: createJSONStorage(() => sessionStorage) },
  ),
);
