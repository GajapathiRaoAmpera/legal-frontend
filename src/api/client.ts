// The only HTTP client (ADR-0002). Feature hooks call `client` + `unwrap`; components never fetch.
import createClient, { type Middleware } from "openapi-fetch";
import { session } from "@/auth/session";
import { ApiError, toApiError } from "./errors";
import type { paths } from "./types";

const auth: Middleware = {
  onRequest({ request }) {
    const token = session.getToken();
    if (token) request.headers.set("Authorization", `Bearer ${token}`);
    return request;
  },
  onResponse({ response }) {
    // any 401 ends the session; RequireAuth redirects to /login?next= (drafts survive in sessionStorage)
    if (response.status === 401) session.clear();
    return undefined;
  },
};

// AbortSignal.timeout(30s) per request; skipped under jsdom whose AbortSignal is not undici's
const timedFetch = (input: Request) =>
  import.meta.env.MODE === "test"
    ? globalThis.fetch(input)
    : globalThis.fetch(input, {
        signal: AbortSignal.any([input.signal, AbortSignal.timeout(30_000)]),
      });

export const client = createClient<paths>({
  baseUrl: globalThis.location.origin,
  fetch: timedFetch,
});
client.use(auth);

type FetchResult<T> =
  | { data: T; error?: never; response: Response }
  | { data?: never; error: unknown; response: Response };

/** Resolve an openapi-fetch call to its data or throw ApiError (problem+json). Network failures → status 0. */
export async function unwrap<T>(call: Promise<FetchResult<T>>): Promise<T> {
  let r: FetchResult<T>;
  try {
    r = await call;
  } catch (e) {
    if (e instanceof ApiError) throw e;
    throw new ApiError({ status: 0, title: "Network error" });
  }
  if (r.error !== undefined || !r.response.ok) throw toApiError(r.error, r.response);
  return r.data as T;
}

export const API_BASE = import.meta.env.VITE_API_BASE ?? "/api/v1";
