import { create } from "zustand";

// One polite live region per page lives in the shell; anything may announce through it.
type AnnouncerState = { message: string; announce(m: string): void };
export const useAnnouncer = create<AnnouncerState>()((set) => ({
  message: "",
  // trailing zero-width toggle forces re-announcement of identical text
  announce: (m) => set((s) => ({ message: s.message === m ? `${m}\u200b` : m })),
}));
export const announce = (m: string) => useAnnouncer.getState().announce(m);
