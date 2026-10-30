import { useEffect, useMemo } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { client, unwrap } from "@/api/client";
import type { ApiError } from "@/api/errors";
import { keys } from "@/api/keys";
import type { ClausePage, ContractText } from "@/api/types";

export function useContractText(contractId: string) {
  return useQuery<ContractText, ApiError>({
    queryKey: keys.contractText(contractId),
    queryFn: ({ signal }) =>
      unwrap(
        client.GET("/api/v1/contracts/{contract_id}/text", {
          params: { path: { contract_id: contractId } },
          signal,
        }),
      ),
    staleTime: Infinity, // immutable per current_version_id
  });
}

const LIMIT = 200;

/** Progressive clause loading: pages of 200 fetched sequentially (one in flight) until `total`. */
export function useClauses(contractId: string) {
  const q = useInfiniteQuery<ClausePage, ApiError>({
    queryKey: keys.clauses(contractId),
    queryFn: ({ pageParam, signal }) =>
      unwrap(
        client.GET("/api/v1/contracts/{contract_id}/clauses", {
          params: {
            path: { contract_id: contractId },
            query: { limit: LIMIT, offset: Number(pageParam) },
          },
          signal,
        }),
      ),
    initialPageParam: 0,
    getNextPageParam: (last) =>
      last.offset + last.limit < last.total ? last.offset + last.limit : undefined,
  });
  const { hasNextPage, isFetchingNextPage, fetchNextPage, isError } = q;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage && !isError) void fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage, isError]);

  const clauses = useMemo(
    () => (q.data?.pages.flatMap((p) => p.items) ?? []).sort((a, b) => a.order - b.order),
    [q.data],
  );
  const total = q.data?.pages[0]?.total ?? null;
  return {
    isPending: q.isPending,
    isError: q.isError,
    error: q.error,
    refetch: q.refetch,
    clauses,
    total,
    complete: total !== null && clauses.length >= total,
  };
}
