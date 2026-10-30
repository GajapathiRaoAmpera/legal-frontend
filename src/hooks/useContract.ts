import { useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/api/client";
import type { ApiError } from "@/api/errors";
import { keys } from "@/api/keys";
import type { Contract, ContractStatus } from "@/api/types";

export const ACTIVE_STATUSES: ReadonlySet<ContractStatus> = new Set([
  "uploaded",
  "parsing",
  "analyzing",
]);

export function useContract(contractId: string, opts: { poll?: boolean } = {}) {
  return useQuery<Contract, ApiError>({
    queryKey: keys.contract(contractId),
    queryFn: ({ signal }) =>
      unwrap(
        client.GET("/api/v1/contracts/{contract_id}", {
          params: { path: { contract_id: contractId } },
          signal,
        }),
      ),
    refetchInterval: opts.poll ? 5000 : false,
  });
}
