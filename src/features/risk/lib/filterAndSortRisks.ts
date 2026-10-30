import type { ClauseType, ClauseWithRisk, RiskLevel } from "@/api/types";
import { rankOf } from "../riskMeta";

export type RiskSortKey = "score" | "level" | "clause_type" | "order";
export type SortDir = "asc" | "desc";
export type LevelFilter = RiskLevel | "none"; // "none" = Not assessed
export type RiskFilters = {
  levels: LevelFilter[];
  types: ClauseType[];
  needsHuman: boolean;
  q: string;
};
export type RiskRow = {
  clause: ClauseWithRisk;
  level: RiskLevel | null;
  score: number | null;
  rank: 0 | 1 | 2 | 3;
};

/** Pure filter + stable sort. Default sort is level desc then score desc; unassessed rows sort last. */
export function filterAndSortRisks(
  items: ClauseWithRisk[],
  f: RiskFilters,
  sort: RiskSortKey,
  dir: SortDir,
): RiskRow[] {
  const q = f.q.trim().toLowerCase();
  const rows: RiskRow[] = items
    .filter((c) => {
      if (f.levels.length && !f.levels.includes(c.risk?.level ?? "none")) return false;
      if (f.types.length && !f.types.includes(c.clause_type)) return false;
      if (f.needsHuman && !c.needs_human) return false;
      if (q && !`${c.heading ?? ""} ${c.text}`.toLowerCase().includes(q)) return false;
      return true;
    })
    .map((c) => ({
      clause: c,
      level: c.risk?.level ?? null,
      score: c.risk?.score ?? null,
      rank: rankOf(c.risk?.level),
    }));

  const sign = dir === "asc" ? 1 : -1;
  const cmp = (a: RiskRow, b: RiskRow): number => {
    // nulls last regardless of direction
    if (sort === "score" || sort === "level") {
      if (a.level === null && b.level !== null) return 1;
      if (b.level === null && a.level !== null) return -1;
    }
    switch (sort) {
      case "level":
        return sign * (a.rank - b.rank) || sign * ((a.score ?? 0) - (b.score ?? 0));
      case "score":
        return sign * ((a.score ?? 0) - (b.score ?? 0));
      case "clause_type":
        return sign * a.clause.clause_type.localeCompare(b.clause.clause_type);
      case "order":
        return sign * (a.clause.order - b.clause.order);
    }
  };
  // Array.prototype.sort is stable; tie-break on document order for determinism
  return rows.sort((a, b) => cmp(a, b) || a.clause.order - b.clause.order);
}
