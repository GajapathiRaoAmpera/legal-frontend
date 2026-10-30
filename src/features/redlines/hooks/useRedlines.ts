import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { client, unwrap } from "@/api/client";
import { errorMessage, type ApiError } from "@/api/errors";
import { keys } from "@/api/keys";
import type { Comment, FeedbackKind, Redline } from "@/api/types";
import { log } from "@/lib/log";
import { toast } from "@/stores/toasts";

export type RedlineAction =
  | { kind: "accept"; redlineId: string; label: string }
  | { kind: "reject"; redlineId: string; label: string }
  | { kind: "edit"; redlineId: string; label: string; editedText: string };

export function useRedlines(contractId: string) {
  return useQuery<Redline[], ApiError>({
    queryKey: keys.redlines(contractId),
    queryFn: ({ signal }) =>
      unwrap(
        client.GET("/api/v1/contracts/{contract_id}/redlines", {
          params: { path: { contract_id: contractId } },
          signal,
        }),
      ),
    refetchOnWindowFocus: true,
  });
}

/** cancel in-flight GETs → snapshot → patch (contract-ui-performance §7). */
export async function optimisticListUpdate<T extends { id: string }>(
  qc: QueryClient,
  key: QueryKey,
  id: string,
  patch: (item: T) => T,
): Promise<{ previous: T[] | undefined }> {
  await qc.cancelQueries({ queryKey: key });
  const previous = qc.getQueryData<T[]>(key);
  qc.setQueryData<T[]>(key, (list) => list?.map((x) => (x.id === id ? patch(x) : x)));
  return { previous };
}

const invalidateAfterRedline = (qc: QueryClient, contractId: string) => {
  for (const k of [keys.redlines(contractId), keys.package(contractId), keys.audit(contractId)])
    void qc.invalidateQueries({ queryKey: k });
};

export function useSendFeedback() {
  return useMutation<
    unknown,
    ApiError,
    { redline_id: string; kind: FeedbackKind; chosen_text: string | null }
  >({
    mutationFn: (body) => unwrap(client.POST("/api/v1/feedback", { body })),
    // training-data capture never blocks or rolls back the decision
    onError: (e, v) => log.warn("feedback failed", { redlineId: v.redline_id, status: e.status }),
  });
}

/** Accept / reject / edit: optimistic with rollback; feedback posted only after the decision succeeds. */
export function useRedlineDecision(
  contractId: string,
  opts: { onRollback?: (redlineId: string) => void } = {},
) {
  const qc = useQueryClient();
  const feedback = useSendFeedback();
  const key = keys.redlines(contractId);
  return useMutation<Redline, ApiError, RedlineAction, { previous: Redline[] | undefined }>({
    // scoped mutations run serially, so stacked snapshots roll back in order
    scope: { id: `redlines-${contractId}` },
    mutationFn: (a) => {
      const path = { params: { path: { redline_id: a.redlineId } } };
      switch (a.kind) {
        case "accept":
          return unwrap(client.POST("/api/v1/redlines/{redline_id}/accept", path));
        case "reject":
          return unwrap(client.POST("/api/v1/redlines/{redline_id}/reject", path));
        case "edit":
          return unwrap(
            client.PATCH("/api/v1/redlines/{redline_id}", {
              ...path,
              body: { edited_text: a.editedText },
            }),
          );
      }
    },
    onMutate: (a) =>
      optimisticListUpdate<Redline>(qc, key, a.redlineId, (r) =>
        a.kind === "edit"
          ? { ...r, status: "edited", edited_text: a.editedText }
          : { ...r, status: a.kind === "accept" ? "accepted" : "rejected" },
      ),
    onSuccess: (redline, a) => {
      qc.setQueryData<Redline[]>(key, (list) =>
        list?.map((r) => (r.id === redline.id ? redline : r)),
      );
      feedback.mutate({
        redline_id: a.redlineId,
        kind: a.kind,
        chosen_text: a.kind === "edit" ? a.editedText : null,
      });
    },
    onError: (e, a, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
      const verb = a.kind === "accept" ? "Accept" : a.kind === "reject" ? "Reject" : "Edit";
      if (e.status === 409)
        toast.error(
          `${verb} failed for ${a.label}.`,
          "This redline changed or the package is locked. Showing the latest version.",
        );
      else toast.error(`${verb} failed for ${a.label}.`, errorMessage(e));
      opts.onRollback?.(a.redlineId);
    },
    onSettled: () => invalidateAfterRedline(qc, contractId),
  });
}

/** Optimistic comment append with a temp id; replaced on success, removed on failure. */
export function useAddComment(contractId: string, author: string) {
  const qc = useQueryClient();
  const key = keys.redlines(contractId);
  return useMutation<
    Comment,
    ApiError,
    { redlineId: string; body: string },
    { previous: Redline[] | undefined; tempId: string }
  >({
    mutationFn: ({ redlineId, body }) =>
      unwrap(
        client.POST("/api/v1/redlines/{redline_id}/comments", {
          params: { path: { redline_id: redlineId } },
          body: { body },
        }),
      ),
    onMutate: async ({ redlineId, body }) => {
      const tempId = `temp-${Date.now()}`;
      const { previous } = await optimisticListUpdate<Redline>(qc, key, redlineId, (r) => ({
        ...r,
        comments: [
          ...r.comments,
          { id: tempId, author, body, created_at: new Date().toISOString() },
        ],
      }));
      return { previous, tempId };
    },
    onSuccess: (comment, { redlineId }, ctx) =>
      qc.setQueryData<Redline[]>(key, (list) =>
        list?.map((r) =>
          r.id === redlineId
            ? { ...r, comments: r.comments.map((c) => (c.id === ctx.tempId ? comment : c)) }
            : r,
        ),
      ),
    onError: (e, _v, ctx) => {
      if (ctx) qc.setQueryData(key, ctx.previous);
      toast.error("Comment not posted.", errorMessage(e));
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: key }),
  });
}
