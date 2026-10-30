import { useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/api/client";
import type { ApiError } from "@/api/errors";
import { keys } from "@/api/keys";
import type { ClauseType, PlaybookPositionOut, RiskReport } from "@/api/types";

export function useRiskReport(contractId: string, opts: { poll?: boolean } = {}) {
  return useQuery<RiskReport, ApiError>({
    queryKey: keys.riskReport(contractId),
    queryFn: ({ signal }) =>
      unwrap(
        client.GET("/api/v1/contracts/{contract_id}/risk-report", {
          params: { path: { contract_id: contractId } },
          signal,
        }),
      ),
    // while analyzing, SSE `done` invalidates; this light poll keeps partial counts moving
    refetchInterval: opts.poll ? 5000 : false,
  });
}

/** Fetched lazily, only when the provenance drawer opens. */
export function usePositions(clauseType: ClauseType | null, enabled = true) {
  return useQuery<PlaybookPositionOut[], ApiError>({
    queryKey: keys.positions(clauseType),
    queryFn: ({ signal }) =>
      unwrap(
        client.GET("/api/v1/playbook/positions", {
          params: { query: clauseType ? { clause_type: clauseType } : {} },
          signal,
        }),
      ),
    enabled,
  });
}
