export class ApiError extends Error {
  readonly status: number;
  readonly type: string;
  readonly title: string;
  readonly detail: string | null;
  readonly instance: string | null;
  readonly retryAfter: number | null;

  constructor(init: {
    status: number;
    type?: string;
    title: string;
    detail?: string | null;
    instance?: string | null;
    retryAfter?: number | null;
  }) {
    super(init.title);
    this.name = "ApiError";
    this.status = init.status;
    this.type = init.type ?? "about:blank";
    this.title = init.title;
    this.detail = init.detail ?? null;
    this.instance = init.instance ?? null;
    this.retryAfter = init.retryAfter ?? null;
  }
}

export const isApiError = (e: unknown): e is ApiError => e instanceof ApiError;

const str = (v: unknown): string | null => (typeof v === "string" ? v : null);

/** Map an openapi-fetch error body (problem+json, FastAPI {detail}, or text) to ApiError. Never echoes request bodies. */
export function toApiError(body: unknown, response: Response): ApiError {
  const retry = Number(response.headers.get("Retry-After"));
  const o = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  // FastAPI validation errors use detail: [{msg, loc}] — keep the first message only
  const detail = Array.isArray(o.detail)
    ? str((o.detail[0] as Record<string, unknown> | undefined)?.msg)
    : str(o.detail);
  return new ApiError({
    status: response.status,
    type: str(o.type) ?? "about:blank",
    title: str(o.title) ?? (response.statusText || `Request failed (${response.status})`),
    detail,
    instance: str(o.instance),
    retryAfter: Number.isFinite(retry) && retry > 0 ? retry : null,
  });
}

/** Human message for toasts / alerts: problem title + detail only (SECURITY.md §5). */
export function errorMessage(e: unknown): string {
  if (isApiError(e)) {
    if (e.status === 0) return "Can't reach the server. Check your connection and try again.";
    if (e.status === 429 && e.retryAfter)
      return `Too many requests. Try again in ${e.retryAfter} s.`;
    return e.detail ? `${e.title}: ${e.detail}` : e.title;
  }
  return "Something went wrong. Try again.";
}
