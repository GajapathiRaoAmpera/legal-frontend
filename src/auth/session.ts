// The ONLY module that touches token storage (SECURITY.md §1): memory is the source of truth,
// mirrored to sessionStorage so a same-tab reload survives. Never localStorage, cookies, URLs or logs.
import type { Me } from "@/api/types";

export type Session = { access_token: string; user: Me; exp: number | null };

const KEY = "auth.session";
let current: Session | null = null;
const listeners = new Set<() => void>();

function decodeExp(token: string): number | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    const json: unknown = JSON.parse(atob(payload.replace(/-/g, "+").replace(/_/g, "/")));
    const exp = (json as { exp?: unknown }).exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
}

const expired = (s: Session) => s.exp !== null && s.exp * 1000 <= Date.now();

function load(): Session | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (!raw) return null;
    const s = JSON.parse(raw) as Session;
    if (typeof s.access_token !== "string" || expired(s)) {
      sessionStorage.removeItem(KEY);
      return null;
    }
    return s;
  } catch {
    return null;
  }
}
current = load();

const emit = () => listeners.forEach((l) => l());

export const session = {
  get: (): Session | null => {
    if (current && expired(current)) session.clear();
    return current;
  },
  getToken: (): string | null => {
    return session.get()?.access_token ?? null;
  },
  set: (input: { access_token: string; user: Me }): Session => {
    current = { ...input, exp: decodeExp(input.access_token) };
    sessionStorage.setItem(KEY, JSON.stringify(current));
    emit();
    return current;
  },
  clear: (): void => {
    if (current === null && sessionStorage.getItem(KEY) === null) return;
    current = null;
    sessionStorage.removeItem(KEY);
    emit();
  },
  subscribe: (l: () => void): (() => void) => {
    listeners.add(l);
    return () => listeners.delete(l);
  },
};
