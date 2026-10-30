import { useDeferredValue, useMemo, useState } from "react";
import { Copy, X } from "lucide-react";
import { useParams } from "react-router-dom";
import type { ClauseType } from "@/api/types";
import { QueryErrorAlert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputClass } from "@/components/ui/Field";
import { Skeleton } from "@/components/ui/Skeleton";
import { ACTIVE_STATUSES, useContract } from "@/hooks/useContract";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { cn } from "@/lib/cn";
import { CLAUSE_TYPE_LABEL, CLAUSE_TYPES } from "@/lib/format";
import { toast } from "@/stores/toasts";
import { ProvenanceDrawer } from "../components/ProvenanceDrawer";
import { RiskHeatmap } from "../components/RiskHeatmap";
import { RiskTable } from "../components/RiskTable";
import { SummaryCards } from "../components/SummaryCards";
import { useRiskFilters } from "../hooks/useRiskFilters";
import { useRiskReport } from "../hooks/useRiskReport";
import { filterAndSortRisks, type LevelFilter } from "../lib/filterAndSortRisks";
import { RISK_LEVELS, RISK_META } from "../riskMeta";

export function Component() {
  const { contractId = "" } = useParams();
  const contract = useContract(contractId);
  useDocumentTitle(contract.data?.title, "Risks");
  const analyzing = contract.data ? ACTIVE_STATUSES.has(contract.data.status) : false;
  const report = useRiskReport(contractId, { poll: analyzing });
  const [f, setF] = useRiskFilters();
  const q = useDeferredValue(f.q);
  const [provenanceId, setProvenanceId] = useState<string | null>(null);
  const rows = useMemo(
    () => (report.data ? filterAndSortRisks(report.data.items, { ...f, q }, f.sort, f.dir) : []),
    [report.data, f, q],
  );

  if (report.isError)
    return <QueryErrorAlert error={report.error} onRetry={() => void report.refetch()} />;
  if (report.isPending) {
    return (
      <div className="flex flex-col gap-4" role="status">
        <span className="sr-only">Loading risk report…</span>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-80" />
      </div>
    );
  }

  const data = report.data;
  const needsHuman = data.items.filter((c) => c.needs_human).length;
  const singleLevel = f.levels.length === 1 && f.levels[0] !== "none" ? f.levels[0] : undefined;
  const selected =
    f.types.length === 1 && singleLevel && f.types[0]
      ? { type: f.types[0], level: singleLevel }
      : null;
  const filtersOn = f.levels.length > 0 || f.types.length > 0 || f.needsHuman || f.q !== "";
  const toggleLevel = (l: LevelFilter) =>
    setF({ levels: f.levels.includes(l) ? f.levels.filter((x) => x !== l) : [...f.levels, l] });
  const filterName = [
    ...f.levels.map((l) => (l === "none" ? "Not assessed" : l)),
    ...f.types.map((t) => CLAUSE_TYPE_LABEL[t]),
  ].join(" · ");

  return (
    <div className="flex flex-col gap-6">
      <h2 className="sr-only">Risk dashboard</h2>
      <SummaryCards
        counts={data.counts}
        needsHuman={needsHuman}
        playbookVersionHash={contract.data?.playbook_version_hash ?? null}
      />

      {data.items.length === 0 ? (
        <EmptyState
          message={analyzing ? "Clauses are still being extracted." : "No clauses were extracted."}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,26rem)_minmax(0,1fr)]">
            <div className="rounded-lg border border-border bg-surface p-card">
              <RiskHeatmap
                rows={data.heatmap}
                selected={selected}
                onSelect={(cell) =>
                  setF(
                    cell ? { types: [cell.type], levels: [cell.level] } : { types: [], levels: [] },
                  )
                }
              />
            </div>
            <section
              aria-labelledby="exec-summary"
              className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-card"
            >
              <div className="flex items-center justify-between gap-2">
                <h2 id="exec-summary" className="text-xl font-semibold">
                  Executive summary
                </h2>
                <Button
                  size="sm"
                  variant="ghost"
                  leadingIcon={Copy}
                  onClick={() =>
                    void (navigator.clipboard as Clipboard | undefined)
                      ?.writeText(data.executive_summary)
                      .then(() => toast.info("Summary copied."))
                  }
                >
                  Copy summary
                </Button>
              </div>
              <p className="max-w-[72ch] font-serif text-md whitespace-pre-line">
                {data.executive_summary || "The executive summary is not available yet."}
              </p>
            </section>
          </div>

          <section aria-labelledby="risk-list" className="flex flex-col gap-3">
            <h2 id="risk-list" className="text-xl font-semibold">
              Clause risks
            </h2>
            <div role="group" aria-label="Filters" className="flex flex-wrap items-end gap-3">
              <div role="group" aria-label="Risk level" className="flex flex-wrap gap-1">
                {RISK_LEVELS.map((l) => {
                  const Icon = RISK_META[l].icon;
                  return (
                    <Button
                      key={l}
                      size="sm"
                      aria-pressed={f.levels.includes(l)}
                      onClick={() => toggleLevel(l)}
                      className={cn(f.levels.includes(l) && "border-primary bg-sunken")}
                    >
                      <Icon aria-hidden="true" className={cn("size-3.5", RISK_META[l].cls.fg)} />
                      {RISK_META[l].label}
                    </Button>
                  );
                })}
                <Button
                  size="sm"
                  aria-pressed={f.levels.includes("none")}
                  onClick={() => toggleLevel("none")}
                  className={cn(f.levels.includes("none") && "border-primary bg-sunken")}
                >
                  Not assessed
                </Button>
              </div>
              <div className="flex flex-col gap-1">
                <label htmlFor="risk-type" className="text-xs font-medium">
                  Clause type
                </label>
                <select
                  id="risk-type"
                  className={cn(inputClass, "h-7 w-auto text-sm")}
                  value={f.types.length === 1 ? f.types[0] : ""}
                  onChange={(e) =>
                    setF({ types: e.target.value ? [e.target.value as ClauseType] : [] })
                  }
                >
                  <option value="">All types</option>
                  {CLAUSE_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {CLAUSE_TYPE_LABEL[t]}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex h-7 items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="size-4 accent-primary"
                  checked={f.needsHuman}
                  onChange={(e) => setF({ needsHuman: e.target.checked })}
                />
                Needs review only
              </label>
              <div className="flex flex-col gap-1">
                <label htmlFor="risk-q" className="text-xs font-medium">
                  Search clauses
                </label>
                <input
                  id="risk-q"
                  type="search"
                  className={cn(inputClass, "h-7 w-56 text-sm")}
                  value={f.q}
                  onChange={(e) => setF({ q: e.target.value })}
                />
              </div>
              {filtersOn ? (
                <Button
                  size="sm"
                  variant="ghost"
                  leadingIcon={X}
                  onClick={() => setF({ levels: [], types: [], needsHuman: false, q: "" })}
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
            {rows.length === 0 ? (
              <EmptyState
                message={`No clauses match ${filterName || "these filters"}.`}
                action={
                  <Button onClick={() => setF({ levels: [], types: [], needsHuman: false, q: "" })}>
                    Clear filters
                  </Button>
                }
              />
            ) : (
              <RiskTable
                contractId={contractId}
                rows={rows}
                sort={f.sort}
                dir={f.dir}
                onSort={(sort, dir) => setF({ sort, dir })}
                onOpenProvenance={setProvenanceId}
              />
            )}
          </section>
        </>
      )}
      <ProvenanceDrawer
        contractId={contractId}
        clause={provenanceId ? (data.items.find((c) => c.id === provenanceId) ?? null) : null}
        open={provenanceId !== null}
        onOpenChange={(o) => !o && setProvenanceId(null)}
        currentPlaybookHash={contract.data?.playbook_version_hash ?? null}
      />
    </div>
  );
}
