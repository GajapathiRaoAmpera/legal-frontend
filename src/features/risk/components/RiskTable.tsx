import { ArrowDown, ArrowUp, ArrowUpDown, CircleHelp, ExternalLink, Info } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import { CLAUSE_TYPE_LABEL } from "@/lib/format";
import type { RiskRow, RiskSortKey, SortDir } from "../lib/filterAndSortRisks";
import { RiskBadge } from "../RiskBadge";

const COLS: { key: RiskSortKey | null; label: string; right?: boolean }[] = [
  { key: "level", label: "Level" },
  { key: "score", label: "Score", right: true },
  { key: "clause_type", label: "Clause type" },
  { key: "order", label: "Clause" },
  { key: null, label: "Red flags" },
  { key: null, label: "Needs review" },
  { key: null, label: "Actions" },
];

export function RiskTable({
  contractId,
  rows,
  sort,
  dir,
  onSort,
  onOpenProvenance,
}: {
  contractId: string;
  rows: RiskRow[];
  sort: RiskSortKey;
  dir: SortDir;
  onSort: (key: RiskSortKey, dir: SortDir) => void;
  onOpenProvenance: (clauseId: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <table className="w-full border-collapse text-sm max-md:block">
        <caption className="sr-only">Clause risks, {rows.length} rows</caption>
        <thead className="bg-sunken text-left text-xs font-medium text-fg-muted max-md:hidden">
          <tr>
            {COLS.map((c) => {
              const active = c.key === sort;
              const Icon = !active ? ArrowUpDown : dir === "asc" ? ArrowUp : ArrowDown;
              return (
                <th
                  key={c.label}
                  scope="col"
                  aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}
                  className={cn("cell", c.right && "text-right")}
                >
                  {c.key ? (
                    <button
                      type="button"
                      onClick={() =>
                        c.key && onSort(c.key, active && dir === "desc" ? "asc" : "desc")
                      }
                      className="inline-flex items-center gap-1 rounded-sm hover:text-fg"
                    >
                      {c.label}
                      <Icon aria-hidden="true" className="size-3.5" />
                    </button>
                  ) : c.label === "Actions" ? (
                    <span className="sr-only">Actions</span>
                  ) : (
                    c.label
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody className="max-md:block">
          {rows.map(({ clause: c, score }) => (
            <tr
              key={c.id}
              className="border-t border-border align-top hover:bg-sunken max-md:flex max-md:flex-col max-md:gap-1.5 max-md:p-3"
            >
              <td className="cell max-md:p-0">
                <RiskBadge level={c.risk?.level ?? null} />
              </td>
              <td className="cell text-right tabular-nums max-md:p-0 max-md:text-left">
                <span className="md:sr-only">Score: </span>
                {score ?? "—"}
              </td>
              <td className="cell max-md:p-0">{CLAUSE_TYPE_LABEL[c.clause_type]}</td>
              <td className="max-w-md cell max-md:p-0">
                <span className="block font-medium">{c.heading ?? "Untitled clause"}</span>
                <span className="line-clamp-2 text-fg-muted" title={c.text}>
                  {c.text}
                </span>
              </td>
              <td className="cell max-md:p-0">
                {c.risk?.red_flags.length ? (
                  <ul className="flex flex-col gap-0.5">
                    {c.risk.red_flags.map((f) => (
                      <li key={f}>{f}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-fg-muted">None</span>
                )}
              </td>
              <td className="cell max-md:p-0">
                {c.needs_human ? (
                  <span className="inline-flex items-center gap-1">
                    <CircleHelp aria-hidden="true" className="size-4" />
                    Needs review
                  </span>
                ) : (
                  <span className="text-fg-muted max-md:hidden">No</span>
                )}
              </td>
              <td className="cell max-md:p-0">
                <span className="flex flex-wrap gap-1">
                  <Link
                    to={`/contracts/${contractId}?clause=${c.id}`}
                    className="inline-flex h-7 items-center gap-1 rounded-md px-2 text-sm text-link underline"
                  >
                    <ExternalLink aria-hidden="true" className="size-3.5" />
                    View{" "}
                    <span className="sr-only">
                      {c.heading ?? CLAUSE_TYPE_LABEL[c.clause_type]}
                    </span>{" "}
                    in contract
                  </Link>
                  {c.risk ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      leadingIcon={Info}
                      onClick={() => onOpenProvenance(c.id)}
                      aria-label={`Provenance for ${c.heading ?? CLAUSE_TYPE_LABEL[c.clause_type]}`}
                    >
                      Provenance
                    </Button>
                  ) : null}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
