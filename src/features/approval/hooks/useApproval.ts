import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, unwrap } from "@/api/client";
import { toApiError, type ApiError } from "@/api/errors";
import { keys } from "@/api/keys";
import type { Approval, ApprovalDecision, AuditEvent, Contract, ExportFormat } from "@/api/types";
import { parseContentDisposition, saveBlob, slug } from "@/lib/download";
import { toast } from "@/stores/toasts";
import { EXPORT_FORMATS } from "../lib/exportGate";

export function useApprovals(packageId: string | undefined) {
  return useQuery<Approval[], ApiError>({
    queryKey: keys.approvals(packageId ?? ""),
    queryFn: ({ signal }) =>
      unwrap(
        client.GET("/api/v1/packages/{package_id}/approvals", {
          params: { path: { package_id: packageId ?? "" } },
          signal,
        }),
      ),
    enabled: Boolean(packageId),
  });
}

export function useAudit(contractId: string) {
  return useQuery<AuditEvent[], ApiError>({
    queryKey: keys.audit(contractId),
    queryFn: ({ signal }) =>
      unwrap(
        client.GET("/api/v1/contracts/{contract_id}/audit", {
          params: { path: { contract_id: contractId } },
          signal,
        }),
      ),
  });
}

export type DecisionInput = { decision: ApprovalDecision; comment: string };

const DONE: Record<ApprovalDecision, string> = {
  approve: "Package approved.",
  request_changes: "Changes requested.",
  reject: "Package rejected.",
};

/** NOT optimistic: the new status is shown only after the server confirms. */
export function useSubmitDecision(contractId: string, packageId: string) {
  const qc = useQueryClient();
  return useMutation<Approval, ApiError, DecisionInput>({
    mutationKey: ["approval", packageId],
    mutationFn: ({ decision, comment }) =>
      unwrap(
        client.POST("/api/v1/packages/{package_id}/approvals", {
          params: { path: { package_id: packageId } },
          body: {
            decision,
            comment: comment.trim() === "" && decision !== "reject" ? null : comment.trim(),
          },
        }),
      ),
    onSuccess: (_a, v) => toast.info(DONE[v.decision]),
    onSettled: () => {
      for (const k of [
        keys.package(contractId),
        keys.approvals(packageId),
        keys.audit(contractId),
        keys.contract(contractId),
        keys.contracts(),
      ])
        void qc.invalidateQueries({ queryKey: k });
    },
  });
}

/** Authenticated fetch → blob → <a download>; filename from Content-Disposition. Never window.open (no auth header). */
export function useExport(contract: Contract | undefined) {
  const qc = useQueryClient();
  const contractId = contract?.id ?? "";
  return useMutation<unknown, ApiError, ExportFormat>({
    mutationFn: async (format) => {
      const r = await client.GET("/api/v1/contracts/{contract_id}/export", {
        params: { path: { contract_id: contractId }, query: { format } },
        parseAs: "blob",
      });
      if (!r.response.ok || !(r.data instanceof Blob)) {
        let body: unknown = r.error;
        if (r.error instanceof Blob) {
          try {
            body = JSON.parse(await r.error.text()) as unknown;
          } catch {
            body = null;
          }
        }
        throw toApiError(body, r.response);
      }
      const ext = EXPORT_FORMATS.find((f) => f.format === format)?.ext ?? "docx";
      saveBlob(
        r.data,
        parseContentDisposition(
          r.response.headers.get("Content-Disposition"),
          `${slug(contract?.title ?? "contract")}-${format}.${ext}`,
        ),
      );
    },
    onError: (e) => {
      if (e.status === 409) {
        toast.error("Export is available after a lawyer approves the package.");
        void qc.invalidateQueries({ queryKey: keys.package(contractId) });
      } else toast.error("Export failed.", e.title);
    },
  });
}
