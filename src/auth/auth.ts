// AuthProvider (ADR-0004): dev-token now; an OIDC implementation can replace it with the same interface.
import type { QueryClient } from "@tanstack/react-query";
import { client, unwrap } from "@/api/client";
import { keys } from "@/api/keys";
import type { DevUser } from "@/api/types";
import { useDraftsStore } from "@/stores/drafts";
import { session, type Session } from "./session";

export interface AuthProvider {
  signIn: (input: { user: DevUser }) => Promise<Session>;
  signOut: (qc: QueryClient) => void;
  getToken: () => string | null;
}

export const devTokenProvider: AuthProvider = {
  async signIn({ user }) {
    const res = await unwrap(client.POST("/api/v1/auth/dev-token", { body: { user } }));
    return session.set(res);
  },
  signOut(qc) {
    session.clear();
    qc.clear();
    useDraftsStore.getState().clearAll();
  },
  getToken: () => session.getToken(),
};

/** Only same-origin absolute paths: blocks open redirects (`//evil`, `https://…`). */
export function safeNext(next: string | null): string {
  return next?.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\")
    ? next
    : "/contracts";
}

export const prefetchMe = (qc: QueryClient) =>
  qc.query({ queryKey: keys.me(), queryFn: () => unwrap(client.GET("/api/v1/me")) });
