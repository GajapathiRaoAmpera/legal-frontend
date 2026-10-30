import type { ClauseWithRisk, Redline } from "@/api/types";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { RiskBadge } from "@/features/risk/RiskBadge";
import { cn } from "@/lib/cn";
import { CLAUSE_TYPE_LABEL } from "@/lib/format";

export function redlineLabel(clause: ClauseWithRisk | undefined): string {
  return clause ? (clause.heading ?? CLAUSE_TYPE_LABEL[clause.clause_type]) : "Redline";
}

export function RedlineList({
  redlines,
  clausesById,
  selectedId,
  onSelect,
}: {
  redlines: Redline[];
  clausesById: Map<string, ClauseWithRisk>;
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <nav aria-label="Redlines">
      <ol className="flex flex-col gap-1">
        {redlines.map((r) => {
          const c = clausesById.get(r.clause_id);
          const active = r.id === selectedId;
          return (
            <li key={r.id}>
              <button
                type="button"
                aria-current={active ? "true" : undefined}
                onClick={() => onSelect(r.id)}
                className={cn(
                  "flex w-full flex-col items-start gap-1 rounded-md border-l-2 px-2 py-2 text-left text-sm hover:bg-sunken",
                  active ? "border-primary bg-sunken" : "border-transparent",
                )}
              >
                <span className="font-medium">{redlineLabel(c)}</span>
                <span className="flex flex-wrap items-center gap-1">
                  <StatusBadge status={r.status} />
                  <RiskBadge level={c?.risk?.level ?? null} />
                </span>
                <span className="line-clamp-2 text-xs text-fg-muted">
                  {r.original_text.slice(0, 80)}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
