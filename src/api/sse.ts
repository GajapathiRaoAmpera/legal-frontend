// SSE is not in OpenAPI: payload types follow API_CONTRACT.md (events progress | status | done | error).
import type { ContractStatus } from "./types";

export const SSE_STAGES = [
  "parsing",
  "extracting",
  "assessing",
  "negotiating",
  "reviewing",
  "awaiting_lawyer",
  "exporting",
] as const;
export type SseStage = (typeof SSE_STAGES)[number];

export type ProgressEvent = {
  stage: string;
  node: string;
  done: number;
  total: number;
  message: string;
};
export type StatusEvent = { status: ContractStatus };
export type ErrorEvent = { message: string; code?: string };
export type ContractEvent =
  | { type: "progress"; data: ProgressEvent }
  | { type: "status"; data: StatusEvent }
  | { type: "done" }
  | { type: "error"; data: ErrorEvent };

const STATUSES: readonly ContractStatus[] = [
  "uploaded",
  "parsing",
  "analyzing",
  "awaiting_lawyer",
  "changes_requested",
  "approved",
  "rejected",
  "failed",
];

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null;

/** Pure, shape-validating parser. Returns null on garbage. */
export function parseSseEvent(type: string, data: string | null): ContractEvent | null {
  if (type === "done") return { type: "done" };
  let v: unknown;
  try {
    v = data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
  if (!isObj(v)) return null;
  switch (type) {
    case "progress": {
      const { stage, node, done, total, message } = v;
      if (typeof stage !== "string" || typeof done !== "number" || typeof total !== "number")
        return null;
      return {
        type: "progress",
        data: {
          stage,
          node: typeof node === "string" ? node : "",
          done,
          total,
          message: typeof message === "string" ? message : "",
        },
      };
    }
    case "status":
      return STATUSES.includes(v.status as ContractStatus)
        ? { type: "status", data: { status: v.status as ContractStatus } }
        : null;
    case "error":
      return {
        type: "error",
        data: {
          message: typeof v.message === "string" ? v.message : "Analysis failed.",
          ...(typeof v.code === "string" ? { code: v.code } : {}),
        },
      };
    default:
      return null;
  }
}

/** 1s·2^n capped at 30s, ±20% jitter. */
export function backoffDelay(attempt: number, rand: () => number = Math.random): number {
  const base = Math.min(30_000, 1000 * 2 ** attempt);
  return Math.round(base * (0.8 + rand() * 0.4));
}
