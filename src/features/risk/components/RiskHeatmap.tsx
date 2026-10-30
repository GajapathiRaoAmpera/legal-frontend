import { useRef, useState, type KeyboardEvent } from "react";
import type { ClauseType, HeatmapRow, RiskLevel } from "@/api/types";
import { cn } from "@/lib/cn";
import { CLAUSE_TYPE_LABEL, CLAUSE_TYPES } from "@/lib/format";
import { RISK_LEVELS, RISK_META } from "../riskMeta";

export type HeatCell = { type: ClauseType; level: RiskLevel };

/**
 * Clause type × severity as a real <table> (it is its own accessible alternative). Cells are buttons with
 * roving tabindex (arrow keys); the count is the signal, fill does not scale with it. Zero cells are disabled.
 */
export function RiskHeatmap({
  rows,
  selected,
  onSelect,
}: {
  rows: HeatmapRow[];
  selected: HeatCell | null;
  onSelect: (cell: HeatCell | null) => void;
}) {
  const byType = new Map(rows.map((r) => [r.clause_type, r]));
  const grid = CLAUSE_TYPES.map(
    (t) => byType.get(t) ?? { clause_type: t, High: 0, Medium: 0, Low: 0 },
  );
  const [focus, setFocus] = useState<[number, number]>([0, 0]);
  const refs = useRef(new Map<string, HTMLButtonElement>());

  const move = (e: KeyboardEvent, r: number, c: number) => {
    const d: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const delta = d[e.key] ?? (e.key === "Home" ? [0, -c] : e.key === "End" ? [0, 2 - c] : null);
    if (!delta) return;
    e.preventDefault();
    const nr = Math.min(grid.length - 1, Math.max(0, r + delta[0]));
    const nc = Math.min(2, Math.max(0, c + delta[1]));
    setFocus([nr, nc]);
    refs.current.get(`${nr}:${nc}`)?.focus();
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <caption className="mb-2 text-left text-xl font-semibold">
          Risk by clause type and severity
        </caption>
        <thead>
          <tr>
            <th scope="col" className="cell text-left text-xs font-medium text-fg-muted">
              Clause type
            </th>
            {RISK_LEVELS.map((l) => {
              const Icon = RISK_META[l].icon;
              return (
                <th
                  key={l}
                  scope="col"
                  className={cn("cell text-center text-xs font-medium", RISK_META[l].cls.fg)}
                >
                  <span className="inline-flex items-center gap-1">
                    <Icon aria-hidden="true" className="size-3.5" />
                    {RISK_META[l].label}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {grid.map((row, r) => (
            <tr key={row.clause_type} className="border-t border-border">
              <th scope="row" className="cell text-left font-normal">
                {CLAUSE_TYPE_LABEL[row.clause_type]}
              </th>
              {RISK_LEVELS.map((l, c) => {
                const n = row[l];
                const isSel = selected?.type === row.clause_type && selected.level === l;
                const tabbable = focus[0] === r && focus[1] === c;
                return (
                  <td key={l} className="p-0.5 text-center">
                    <button
                      ref={(el) => {
                        if (el) refs.current.set(`${r}:${c}`, el);
                      }}
                      type="button"
                      tabIndex={tabbable ? 0 : -1}
                      aria-pressed={isSel}
                      aria-disabled={n === 0 || undefined}
                      aria-label={`${CLAUSE_TYPE_LABEL[row.clause_type]}, ${l}: ${n} ${n === 1 ? "clause" : "clauses"}`}
                      onFocus={() => setFocus([r, c])}
                      onKeyDown={(e) => move(e, r, c)}
                      onClick={() =>
                        n > 0 && onSelect(isSel ? null : { type: row.clause_type, level: l })
                      }
                      className={cn(
                        "h-row w-full min-w-16 rounded-none tabular-nums",
                        n > 0
                          ? [
                              RISK_META[l].cls.mark,
                              RISK_META[l].cls.fg,
                              "font-semibold focus-ring-double",
                            ]
                          : "cursor-default text-fg-subtle",
                        isSel && "outline-2 outline-offset-[-2px] outline-primary",
                      )}
                    >
                      {n}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
