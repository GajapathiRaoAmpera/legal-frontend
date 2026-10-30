import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { client, unwrap } from "@/api/client";
import type { ApiError } from "@/api/errors";
import { keys } from "@/api/keys";
import type { Contract, ContractPage, ContractStatus } from "@/api/types";

export const PAGE_SIZE = 25;

export function useContracts(p: { offset: number; status: ContractStatus | null }) {
  const params = { limit: PAGE_SIZE, offset: p.offset, status: p.status };
  return useQuery<ContractPage, ApiError>({
    queryKey: keys.contracts(params),
    queryFn: ({ signal }) =>
      unwrap(
        client.GET("/api/v1/contracts", {
          params: {
            query: {
              limit: params.limit,
              offset: params.offset,
              ...(params.status ? { status: params.status } : {}),
            },
          },
          signal,
        }),
      ),
    placeholderData: keepPreviousData,
  });
}

/** Never optimistic: the row appears from the server's 202 response. */
export function useUpload() {
  const qc = useQueryClient();
  return useMutation<Contract, ApiError, { file: File; title: string }>({
    mutationFn: ({ file, title }) =>
      unwrap(
        client.POST("/api/v1/contracts", {
          body: { file: "", ...(title ? { title } : {}) },
          bodySerializer: () => {
            const fd = new FormData();
            fd.append("file", file);
            if (title) fd.append("title", title);
            return fd;
          },
        }),
      ),
    onSuccess: (c) => {
      qc.setQueryData(keys.contract(c.id), c);
      void qc.invalidateQueries({ queryKey: keys.contracts() });
    },
  });
}
