import { create } from "zustand";

export type Toast = { id: number; title: string; description?: string; tone: "info" | "error" };
type ToastState = {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
};

let seq = 0;
export const useToasts = create<ToastState>()((set) => ({
  toasts: [],
  push: (t) => set((s) => ({ toasts: [...s.toasts.slice(-4), { ...t, id: ++seq }] })),
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  info: (title: string, description?: string) =>
    useToasts.getState().push({ title, tone: "info", ...(description ? { description } : {}) }),
  error: (title: string, description?: string) =>
    useToasts.getState().push({ title, tone: "error", ...(description ? { description } : {}) }),
};
