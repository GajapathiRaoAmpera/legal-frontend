import { forwardRef, useId } from "react";
import { Copy, GitCompare, Info } from "lucide-react";
import { Link } from "react-router-dom";
import type { ClauseWithRisk } from "@/api/types";
import { Button } from "@/components/ui/Button";
import { RiskBadge } from "@/features/risk/RiskBadge";
import { RISK_LEVELS, RISK_META } from "@/features/risk/riskMeta";
import { cn } from "@/lib/cn";
import { CLAUSE_TYPE_LABEL } from "@/lib/format";
import { toast } from "@/stores/toasts";

type Props = {
  contractId: string;
  clauses: ClauseWithRisk[];
  active: ClauseWithRisk | null;
  total: number | null;
  onProvenance: (id: string) => void;
  compact?: boolean;
};

export function countLevels(clauses: ClauseWithRisk[]) {
  const counts = { High: 0, Medium: 0, Low: 0, needsHuman: 0 };
  for (const c of clauses) {
    if (c.risk) counts[c.risk.level]++;
    if (c.needs_human) counts.needsHuman++;
  }
  return counts;
}

export function RiskCountsRow({ clauses }: { clauses: ClauseWithRisk[] }) {
  const counts = countLevels(clauses);
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
      {RISK_LEVELS.map((l) => {
        const Icon = RISK_META[l].icon;
        return (
          <li
            key={l}
            className={cn("inline-flex items-center gap-1 font-medium", RISK_META[l].cls.fg)}
          >
            <Icon aria-hidden="true" className="size-4" />
            {RISK_META[l].label} <span className="tabular-nums">{counts[l]}</span>
          </li>
        );
      })}
      <li className="inline-flex items-center gap-1 text-fg">
        Needs review <span className="tabular-nums">{counts.needsHuman}</span>
      </li>
    </ul>
  );
}

/** Sticky right pane: counts + the active clause card. Its heading receives focus on clause activation. */
export const RiskSummary = forwardRef<HTMLHeadingElement, Props>(function RiskSummary(
  { contractId, clauses, active, total, onProvenance },
  headingRef,
) {
  const headingId = useId();
  return (
    <aside
      aria-label="Risk summary"
      className="flex min-h-0 flex-col gap-4 overflow-auto rounded-lg border border-border bg-surface p-card shadow-1"
    >
      <div className="flex flex-col gap-2">
        <h2 className="text-sm font-semibold">Risk summary</h2>
        <RiskCountsRow clauses={clauses} />
        {total !== null && clauses.length < total ? (
          <p className="text-xs text-fg-muted">
            Analyzing… {clauses.length} of {total} clauses
          </p>
        ) : null}
      </div>
      <section
        aria-labelledby={headingId}
        className="flex flex-col gap-3 border-t border-border pt-4"
      >
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className="text-lg font-semibold">
          {active
            ? (active.heading ?? CLAUSE_TYPE_LABEL[active.clause_type])
            : "No clause selected"}
        </h2>
        {!active ? (
          <p className="text-sm text-fg-muted">
            Select a clause in the outline, or press J to go to the next clause.
          </p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              <RiskBadge
                level={active.risk?.level ?? null}
                needsHuman={active.needs_human}
                {...(active.risk ? { score: active.risk.score } : {})}
              />
              <span className="text-sm text-fg-muted">{CLAUSE_TYPE_LABEL[active.clause_type]}</span>
            </div>
            {active.needs_human && !active.risk ? (
              <p className="text-sm">
                Needs human review: the analysis could not score this clause reliably. Read it and
                decide manually.
              </p>
            ) : null}
            {active.risk ? (
              <>
                <p className="text-sm">{active.risk.rationale}</p>
                <figure className="flex flex-col gap-1">
                  <figcaption className="text-xs font-medium text-fg-muted">Quoted span</figcaption>
                  <blockquote
                    className={cn(
                      "font-serif text-md underline decoration-2 underline-offset-4",
                      active.risk.level === "High"
                        ? "decoration-risk-high"
                        : active.risk.level === "Medium"
                          ? "decoration-risk-medium"
                          : "decoration-risk-low",
                    )}
                  >
                    {active.risk.quoted_span}
                  </blockquote>
                </figure>
                {active.risk.red_flags.length ? (
                  <div>
                    <h3 className="text-xs font-medium text-fg-muted">Red flags</h3>
                    <ul className="ml-4 list-disc text-sm">
                      {active.risk.red_flags.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {active.risk?.level === "High" ? (
                <Link
                  to={`/contracts/${contractId}/redlines?clause=${active.id}`}
                  className="inline-flex h-control items-center gap-2 rounded-md border border-border-strong px-3 text-base hover:bg-sunken"
                >
                  <GitCompare aria-hidden="true" className="size-4" />
                  Open redline
                </Link>
              ) : null}
              {active.risk ? (
                <Button leadingIcon={Info} onClick={() => onProvenance(active.id)}>
                  Provenance
                </Button>
              ) : null}
              <Button
                variant="ghost"
                leadingIcon={Copy}
                onClick={() =>
                  void (navigator.clipboard as Clipboard | undefined)?.writeText(active.text).then(
                    () => toast.info("Clause text copied."),
                    () => toast.error("Couldn't copy to the clipboard."),
                  )
                }
              >
                Copy clause text
              </Button>
            </div>
          </>
        )}
      </section>
    </aside>
  );
});
