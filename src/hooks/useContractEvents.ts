import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { API_BASE } from "@/api/client";
import { keys } from "@/api/keys";
import { backoffDelay, parseSseEvent, type ContractEvent, type ProgressEvent } from "@/api/sse";
import type { Contract, ContractStatus } from "@/api/types";
import { session } from "@/auth/session";
import { log } from "@/lib/log";

export type ConnectionState = "connecting" | "open" | "reconnecting" | "closed";
const MAX_ATTEMPTS = 10;
const HIDDEN_CLOSE_MS = 60_000;

/**
 * Live agent progress (contract-ui-performance §6). The token rides in ?access_token= because EventSource
 * cannot send headers; the URL is rebuilt with a fresh token on every reconnect and never logged or rendered.
 */
export function useContractEvents(
  contractId: string,
  opts: { enabled: boolean; onEvent?: (e: ContractEvent) => void },
): {
  lastProgress: ProgressEvent | null;
  status: ContractStatus | null;
  connection: ConnectionState;
  paused: boolean;
} {
  const qc = useQueryClient();
  const [lastProgress, setLastProgress] = useState<ProgressEvent | null>(null);
  const [status, setStatus] = useState<ContractStatus | null>(null);
  const [connection, setConnection] = useState<ConnectionState>("closed");
  const [paused, setPaused] = useState(false);
  const onEvent = useRef(opts.onEvent);
  onEvent.current = opts.onEvent;

  useEffect(() => {
    if (!opts.enabled || typeof EventSource === "undefined") return;
    let es: EventSource | null = null;
    let attempt = 0;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let hiddenTimer: ReturnType<typeof setTimeout> | undefined;
    let frame = 0;
    let pendingProgress: ProgressEvent | null = null;
    let stopped = false;

    const close = (state: ConnectionState = "closed") => {
      es?.close();
      es = null;
      clearTimeout(retry);
      setConnection(state);
    };

    const handle = (e: ContractEvent) => {
      onEvent.current?.(e);
      switch (e.type) {
        case "progress":
          // coalesce to one React update per frame; ignore out-of-order progress within a stage
          if (
            pendingProgress &&
            pendingProgress.stage === e.data.stage &&
            e.data.done < pendingProgress.done
          )
            return;
          pendingProgress = e.data;
          if (!frame)
            frame = requestAnimationFrame(() => {
              frame = 0;
              setLastProgress(pendingProgress);
            });
          return;
        case "status":
          setStatus(e.data.status);
          qc.setQueryData<Contract>(
            keys.contract(contractId),
            (c) => c && { ...c, status: e.data.status },
          );
          void qc.invalidateQueries({ queryKey: keys.contracts() });
          return;
        case "done":
          stopped = true;
          close();
          for (const k of [
            keys.clauses,
            keys.riskReport,
            keys.redlines,
            keys.package,
            keys.contract,
          ])
            void qc.invalidateQueries({ queryKey: k(contractId) });
          void qc.invalidateQueries({ queryKey: keys.contracts() });
          return;
        case "error":
          stopped = true;
          close();
          setStatus("failed");
          qc.setQueryData<Contract>(
            keys.contract(contractId),
            (c) => c && { ...c, status: "failed" },
          );
          return;
      }
    };

    const open = () => {
      const token = session.getToken();
      if (!token || stopped) {
        close();
        return;
      }
      setConnection(attempt === 0 ? "connecting" : "reconnecting");
      es = new EventSource(
        `${API_BASE}/contracts/${encodeURIComponent(contractId)}/events?access_token=${encodeURIComponent(token)}`,
      );
      es.addEventListener("open", () => {
        attempt = 0;
        setPaused(false);
        setConnection("open");
        // events during a gap are lost (no Last-Event-ID replay): refetch state
        void qc.invalidateQueries({ queryKey: keys.contract(contractId) });
      });
      for (const type of ["progress", "status", "done"] as const) {
        es.addEventListener(type, (ev) => {
          const parsed = parseSseEvent(type, ev instanceof MessageEvent ? String(ev.data) : null);
          if (parsed) handle(parsed);
          else log.warn("sse: ignored malformed event", { contractId, type });
        });
      }
      es.addEventListener("error", (ev) => {
        if (ev instanceof MessageEvent && ev.data) {
          const parsed = parseSseEvent("error", String(ev.data));
          if (parsed) handle(parsed);
          return;
        }
        const current = es;
        if (current && current.readyState === EventSource.CLOSED) {
          current.close();
          es = null;
          if (attempt >= MAX_ATTEMPTS) {
            setPaused(true);
            close();
            return;
          }
          setConnection("reconnecting");
          log.debug("sse: reconnecting", { contractId, attempt });
          retry = setTimeout(open, backoffDelay(attempt++));
        } else {
          setConnection("reconnecting");
        }
      });
    };

    const onVisibility = () => {
      if (document.hidden) {
        hiddenTimer = setTimeout(() => close(), HIDDEN_CLOSE_MS);
      } else {
        clearTimeout(hiddenTimer);
        if (!es && !stopped) open();
      }
    };

    open();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stopped = true;
      document.removeEventListener("visibilitychange", onVisibility);
      clearTimeout(hiddenTimer);
      cancelAnimationFrame(frame);
      close();
    };
  }, [contractId, opts.enabled, qc]);

  return { lastProgress, status, connection, paused };
}
