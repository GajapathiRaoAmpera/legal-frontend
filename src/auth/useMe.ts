import { useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/api/client";
import type { ApiError } from "@/api/errors";
import { keys } from "@/api/keys";
import type { Me, Role } from "@/api/types";
import { useSession } from "./useSession";

export function useMe() {
  const s = useSession();
  return useQuery<Me, ApiError>({
    queryKey: keys.me(),
    queryFn: ({ signal }) => unwrap(client.GET("/api/v1/me", { signal })),
    enabled: s !== null,
    // the dev-token response already carries the user; /me confirms it
    ...(s ? { placeholderData: s.user } : {}),
    staleTime: 5 * 60_000,
  });
}

export type Action =
  "approve" | "decideRedline" | "upload" | "editPlaybook" | "startEval" | "resubmit";

// Visibility only; the server enforces authorization (SECURITY.md §2). Only `lawyer` approves (admin cannot).
const NEEDS: Record<Action, readonly Role[]> = {
  approve: ["lawyer"],
  decideRedline: ["reviewer", "lawyer", "admin"],
  upload: ["reviewer", "lawyer", "admin"],
  resubmit: ["reviewer", "lawyer", "admin"],
  editPlaybook: ["admin"],
  startEval: ["admin"],
};

export const can = (roles: readonly Role[] | undefined, action: Action) =>
  (roles ?? []).some((r) => NEEDS[action].includes(r));

export function useCan(action: Action): boolean {
  return can(useMe().data?.roles, action);
}
