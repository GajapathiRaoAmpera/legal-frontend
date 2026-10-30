import { RotateCcw } from "lucide-react";
import type { Contract } from "@/api/types";
import { AgentProgress } from "@/components/AgentProgress";
import { ACTIVE_STATUSES, useContract } from "@/hooks/useContract";
import { useContractEvents } from "@/hooks/useContractEvents";

/** Live row progress. `stream` = one of the ≤6 SSE slots; otherwise poll GET /contracts/{id} every 5s. */
export function ProgressCell({ contract, stream }: { contract: Contract; stream: boolean }) {
  const polled = useContract(contract.id, { poll: !stream });
  const c = polled.data ?? contract;
  const active = ACTIVE_STATUSES.has(c.status);
  const ev = useContractEvents(contract.id, { enabled: stream && active });
  if (c.status === "failed" || ev.status === "failed") {
    return (
      <p className="flex items-center gap-1 text-sm text-danger">
        <RotateCcw aria-hidden="true" className="size-4" />
        Analysis failed. Upload again.
      </p>
    );
  }
  if (!active) return null;
  return (
    <AgentProgress
      title={c.title}
      progress={ev.lastProgress}
      status={ev.status ?? c.status}
      connection={ev.connection}
      paused={ev.paused}
    />
  );
}
