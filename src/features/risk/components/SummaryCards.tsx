import { CircleHelp, Copy } from "lucide-react";
import { Link } from "react-router-dom";
import type { RiskCounts } from "@/api/types";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/cn";
import { shortHash } from "@/lib/format";
import { toast } from "@/stores/toasts";
import { RISK_LEVELS, RISK_META } from "../riskMeta";

export function SummaryCards({
  counts,
  needsHuman,
  playbookVersionHash,
}: {
  counts: RiskCounts;
  needsHuman: number;
  playbookVersionHash: string | null;
}) {
  const card =
    "flex min-h-24 flex-col justify-between gap-2 rounded-lg border border-border bg-surface p-card shadow-1 hover:bg-sunken";
  return (
    <section aria-labelledby="summary-heading" className="flex flex-col gap-2">
      <h2 id="summary-heading" className="text-xl font-semibold">
        Summary
      </h2>
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {RISK_LEVELS.map((l) => {
          const m = RISK_META[l];
          const Icon = m.icon;
          return (
            <li key={l}>
              <Link
                to={`?level=${l}`}
                className={card}
                aria-label={`${m.label}: ${counts[l]} clauses. Show them.`}
              >
                <span
                  className={cn("inline-flex items-center gap-1.5 text-sm font-medium", m.cls.fg)}
                >
                  <Icon aria-hidden="true" className="size-4" />
                  {m.label}
                </span>
                <span className="text-3xl font-semibold tabular-nums">{counts[l]}</span>
              </Link>
            </li>
          );
        })}
        <li>
          <Link
            to="?needs=1"
            className={card}
            aria-label={`Needs review: ${needsHuman} clauses. Show them.`}
          >
            <span className="inline-flex items-center gap-1.5 text-sm font-medium">
              <CircleHelp aria-hidden="true" className="size-4" />
              Needs review
            </span>
            <span className="text-3xl font-semibold tabular-nums">{needsHuman}</span>
          </Link>
        </li>
      </ul>
      <p className="flex items-center gap-2 text-sm text-fg-muted">
        Playbook version{" "}
        <code className="font-mono text-fg" title={playbookVersionHash ?? undefined}>
          {shortHash(playbookVersionHash)}
        </code>
        {playbookVersionHash ? (
          <IconButton
            size="sm"
            icon={Copy}
            label="Copy playbook version hash"
            onClick={() =>
              void (navigator.clipboard as Clipboard | undefined)
                ?.writeText(playbookVersionHash)
                .then(() => toast.info("Hash copied."))
            }
          />
        ) : null}
        <span>
          · Clauses needing review are also counted under their level, so cards do not sum to the
          total.
        </span>
      </p>
    </section>
  );
}
