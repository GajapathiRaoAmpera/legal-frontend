import type { ClauseWithRisk } from "@/api/types";
import { RiskBadge } from "@/features/risk/RiskBadge";
import { cn } from "@/lib/cn";
import { CLAUSE_TYPE_LABEL } from "@/lib/format";
import { Skeleton } from "@/components/ui/Skeleton";

export function ClauseOutline({
  clauses,
  activeClauseId,
  onSelect,
  loading,
  overlapsOf,
}: {
  clauses: ClauseWithRisk[];
  activeClauseId: string | null;
  onSelect: (id: string) => void;
  loading: boolean;
  overlapsOf: (id: string) => ClauseWithRisk[];
}) {
  return (
    <nav aria-label="Clause outline" className="flex min-h-0 flex-col">
      <h2 className="mb-2 text-sm font-semibold">Clauses</h2>
      {clauses.length === 0 && !loading ? (
        <p className="text-sm text-fg-muted">No clauses match the current filter.</p>
      ) : null}
      <ol className="flex min-h-0 flex-col gap-0.5 overflow-auto">
        {clauses.map((c) => {
          const active = c.id === activeClauseId;
          const overlaps = active ? overlapsOf(c.id) : [];
          return (
            <li key={c.id}>
              <button
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => onSelect(c.id)}
                className={cn(
                  "flex w-full flex-col items-start gap-1 rounded-md px-2 py-1.5 text-left text-sm hover:bg-sunken",
                  active ? "border-l-2 border-primary bg-sunken" : "border-l-2 border-transparent",
                )}
              >
                <span className="font-medium text-fg">
                  {c.heading ?? CLAUSE_TYPE_LABEL[c.clause_type]}
                </span>
                <span className="flex flex-wrap items-center gap-1">
                  <RiskBadge level={c.risk?.level ?? null} needsHuman={c.needs_human} />
                  <span className="text-xs text-fg-muted">{CLAUSE_TYPE_LABEL[c.clause_type]}</span>
                </span>
                {overlaps.length ? (
                  <span className="text-xs text-fg-muted">
                    Also part of:{" "}
                    {overlaps
                      .map(
                        (o) =>
                          `${CLAUSE_TYPE_LABEL[o.clause_type]} (${o.risk?.level ?? "Not assessed"})`,
                      )
                      .join(", ")}
                  </span>
                ) : null}
              </button>
            </li>
          );
        })}
        {loading ? (
          <li role="status" className="flex flex-col gap-1 px-2 py-1.5">
            <span className="sr-only">Loading clauses…</span>
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </li>
        ) : null}
      </ol>
    </nav>
  );
}
