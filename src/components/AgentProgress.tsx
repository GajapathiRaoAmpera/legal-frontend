import { useCallback } from "react";
import type { ProgressEvent } from "@/api/sse";
import type { ConnectionState } from "@/hooks/useContractEvents";
import { useThrottledAnnouncement } from "@/hooks/useThrottledAnnouncement";
import { STATUS_LABEL } from "@/lib/format";
import type { ContractStatus } from "@/api/types";

const STAGE_LABEL: Record<string, string> = {
  parsing: "Parsing document",
  extracting: "Extracting clauses",
  assessing: "Assessing risk",
  negotiating: "Drafting redlines",
  reviewing: "Legal consistency review",
  awaiting_lawyer: "Ready for lawyer",
  exporting: "Preparing export",
};
export const stageLabel = (s: string) => STAGE_LABEL[s] ?? s;

/**
 * Determinate progress bar + stage text. Announcements go through the shell's single polite live region,
 * throttled to one per 5s plus immediately on a stage change (legal-a11y §6).
 */
export function AgentProgress({
  title,
  progress,
  status,
  connection,
  paused = false,
}: {
  title: string;
  progress: ProgressEvent | null;
  status: ContractStatus | null;
  connection: ConnectionState;
  paused?: boolean;
}) {
  const pct =
    progress && progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;
  const text = progress
    ? `${title}: ${stageLabel(progress.stage)}, ${progress.done} of ${progress.total}`
    : status
      ? `${title}: ${STATUS_LABEL[status]}`
      : null;
  const stageChanged = useCallback(
    (prev: string, next: string) => prev.split(",")[0] !== next.split(",")[0],
    [],
  );
  useThrottledAnnouncement(text, 5000, stageChanged);

  return (
    <div className="flex min-w-40 flex-col gap-1">
      <div
        role="progressbar"
        aria-label={`${title} analysis progress`}
        aria-valuemin={0}
        aria-valuemax={progress?.total ?? 100}
        aria-valuenow={progress?.done ?? 0}
        aria-valuetext={
          progress
            ? `${stageLabel(progress.stage)}: ${progress.done} of ${progress.total}`
            : "Waiting to start"
        }
        className="h-1.5 w-full overflow-hidden rounded-full bg-sunken"
      >
        <div
          className="h-full origin-left bg-primary transition-transform transition-fast"
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </div>
      <p className="text-xs text-fg-muted">
        {progress
          ? `${stageLabel(progress.stage)} · ${progress.done}/${progress.total}`
          : "Starting…"}
        {connection === "reconnecting" ? " · Reconnecting…" : null}
        {paused ? " · Live updates paused" : null}
      </p>
    </div>
  );
}
