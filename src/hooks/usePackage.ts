import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, unwrap } from "@/api/client";
import { errorMessage, type ApiError } from "@/api/errors";
import { keys } from "@/api/keys";
import type { ReviewPackage } from "@/api/types";
import { toast } from "@/stores/toasts";

export function usePackage(contractId: string) {
  return useQuery<ReviewPackage, ApiError>({
    queryKey: keys.package(contractId),
    queryFn: ({ signal }) =>
      unwrap(
        client.GET("/api/v1/contracts/{contract_id}/package", {
          params: { path: { contract_id: contractId } },
          signal,
        }),
      ),
    refetchOnWindowFocus: true,
  });
}

/** Redline mutations return 409 once the package is approved/rejected (API_CONTRACT). */
export const isLocked = (pkg: ReviewPackage | undefined) =>
  pkg?.status === "approved" || pkg?.status === "rejected";

/** POST /packages/{id}/resubmit (reviewer+, only from changes_requested). Not optimistic. */
export function useResubmit(contractId: string) {
  const qc = useQueryClient();
  return useMutation<ReviewPackage, ApiError, string>({
    mutationFn: (packageId) =>
      unwrap(
        client.POST("/api/v1/packages/{package_id}/resubmit", {
          params: { path: { package_id: packageId } },
        }),
      ),
    onSuccess: (pkg) => {
      qc.setQueryData(keys.package(contractId), pkg);
      toast.info("Package resubmitted to the lawyer.");
    },
    onError: (e) => {
      toast.error("Resubmit failed.", errorMessage(e));
      void qc.invalidateQueries({ queryKey: keys.package(contractId) });
    },
    onSettled: () => {
      for (const k of [keys.audit(contractId), keys.contract(contractId)])
        void qc.invalidateQueries({ queryKey: k });
    },
  });
}
