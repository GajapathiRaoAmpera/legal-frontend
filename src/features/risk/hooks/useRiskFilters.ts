import { useCallback, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { ClauseType } from "@/api/types";
import { CLAUSE_TYPES } from "@/lib/format";
import type { LevelFilter, RiskFilters, RiskSortKey, SortDir } from "../lib/filterAndSortRisks";

const LEVELS: LevelFilter[] = ["High", "Medium", "Low", "none"];
const SORTS: RiskSortKey[] = ["score", "level", "clause_type", "order"];
export type RiskFilterState = RiskFilters & { sort: RiskSortKey; dir: SortDir };

/** Filters + sort live in URL search params (?level=High,Medium&type=&needs=1&q=&sort=&dir=), so back/forward works. */
export function useRiskFilters(): [RiskFilterState, (patch: Partial<RiskFilterState>) => void] {
  const [params, setParams] = useSearchParams();
  const state = useMemo<RiskFilterState>(() => {
    const list = (k: string) => (params.get(k) ?? "").split(",").filter(Boolean);
    const sort = params.get("sort");
    return {
      levels: list("level").filter((l): l is LevelFilter => LEVELS.includes(l as LevelFilter)),
      types: list("type").filter((t): t is ClauseType => CLAUSE_TYPES.includes(t as ClauseType)),
      needsHuman: params.get("needs") === "1",
      q: params.get("q") ?? "",
      sort: SORTS.includes(sort as RiskSortKey) ? (sort as RiskSortKey) : "level",
      dir: params.get("dir") === "asc" ? "asc" : "desc",
    };
  }, [params]);

  const update = useCallback(
    (patch: Partial<RiskFilterState>) =>
      setParams((p) => {
        const next = { ...state, ...patch };
        const put = (k: string, v: string) => (v ? p.set(k, v) : p.delete(k));
        put("level", next.levels.join(","));
        put("type", next.types.join(","));
        put("needs", next.needsHuman ? "1" : "");
        put("q", next.q);
        put("sort", next.sort === "level" ? "" : next.sort);
        put("dir", next.dir === "desc" ? "" : next.dir);
        return p;
      }),
    [setParams, state],
  );
  return [state, update];
}
