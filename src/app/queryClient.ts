import { QueryClient } from "@tanstack/react-query";
import { isApiError } from "@/api/errors";

export function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        // never retry 4xx (status 0 = network → retried)
        retry: (n, err) => n < 2 && !(isApiError(err) && err.status >= 400 && err.status < 500),
        refetchOnWindowFocus: false,
      },
    },
  });
}
