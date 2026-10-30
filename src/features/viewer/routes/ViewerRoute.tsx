import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { ChevronDown, ChevronUp, ListTree, Search, ShieldAlert } from "lucide-react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import type { ClauseWithRisk } from "@/api/types";
import { QueryErrorAlert } from "@/components/ui/Alert";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Dialog";
import { EmptyState } from "@/components/ui/EmptyState";
import { inputClass } from "@/components/ui/Field";
import { IconButton } from "@/components/ui/IconButton";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProvenanceDrawer } from "@/features/risk/components/ProvenanceDrawer";
import { useContract } from "@/hooks/useContract";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useHotkeys } from "@/hooks/useHotkeys";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/cn";
import { CLAUSE_TYPE_LABEL } from "@/lib/format";
import { makeOffsetMapper } from "@/lib/offsets";
import { announce } from "@/stores/announcer";
import { useViewerStore } from "@/stores/viewer";
import { ClauseOutline } from "../components/ClauseOutline";
import { ContractTextView, type ContractTextHandle } from "../components/ContractTextView";
import { RiskCountsRow, RiskSummary } from "../components/RiskSummary";
import { useClauses, useContractText } from "../hooks/useViewerData";
import { blockOf, buildSpans, findMatches, matchSpans, splitIntoBlocks } from "../lib/segments";

/** High-only keeps High clauses and needs_human clauses whose level is null (contract-viewer-ux edge cases). */
export const visibleInFilter = (c: ClauseWithRisk, highOnly: boolean) =>
  !highOnly || c.risk?.level === "High" || (c.needs_human && c.risk === null);

export function Component() {
  const { contractId = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const contract = useContract(contractId);
  useDocumentTitle(contract.data?.title, "Viewer");
  const textQ = useContractText(contractId);
  const clausesQ = useClauses(contractId);
  const { highOnly, toggleHighOnly, query, setQuery, activeMatch, setActiveMatch } =
    useViewerStore();
  const deferredQuery = useDeferredValue(query);
  const [provenanceId, setProvenanceId] = useState<string | null>(null);
  const [outlineOpen, setOutlineOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1280px)");
  const textRef = useRef<ContractTextHandle>(null);
  const summaryHeading = useRef<HTMLHeadingElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const beforeSearch = useRef<HTMLElement | null>(null);

  const activeClauseId = params.get("clause");
  const text = textQ.data?.text ?? "";
  const { clauses } = clausesQ;
  const clausesById = useMemo(() => new Map(clauses.map((c) => [c.id, c])), [clauses]);
  const filtered = useMemo(
    () => clauses.filter((c) => visibleInFilter(c, highOnly)),
    [clauses, highOnly],
  );
  const toIndex = useMemo(() => makeOffsetMapper(text), [text]);
  const blocks = useMemo(
    () => (textQ.data ? splitIntoBlocks(textQ.data.text, textQ.data.sections, toIndex) : []),
    [textQ.data, toIndex],
  );
  // rebuild spans only when the number of loaded clauses changes (pages landing)
  const clauseSpans = useMemo(
    () => buildSpans(clauses, toIndex, text.length),
    [clauses, toIndex, text.length],
  );
  const matches = useMemo(() => findMatches(text, deferredQuery), [text, deferredQuery]);
  const spans = useMemo(
    () =>
      matches.length
        ? [...clauseSpans, ...matchSpans(matches)].sort(
            (a, b) => a.start - b.start || b.end - a.end,
          )
        : clauseSpans,
    [clauseSpans, matches],
  );
  const active = activeClauseId ? (clausesById.get(activeClauseId) ?? null) : null;

  const overlapsOf = useCallback(
    (id: string) => {
      const c = clausesById.get(id);
      if (!c) return [];
      return clauses.filter(
        (o) => o.id !== id && o.start_offset < c.end_offset && o.end_offset > c.start_offset,
      );
    },
    [clauses, clausesById],
  );

  const activate = useCallback(
    (id: string, opts: { focusSummary?: boolean } = {}) => {
      const c = clausesById.get(id);
      if (!c) return;
      setParams(
        (p) => {
          p.set("clause", id);
          return p;
        },
        { replace: true },
      );
      textRef.current?.scrollToBlock(blockOf(blocks, toIndex(c.start_offset)));
      const pos = filtered.findIndex((f) => f.id === id);
      announce(
        `Clause ${pos + 1} of ${filtered.length}, ${CLAUSE_TYPE_LABEL[c.clause_type]}, ${c.risk ? `${c.risk.level} risk` : c.needs_human ? "needs human review" : "not assessed"}`,
      );
      if (opts.focusSummary !== false) summaryHeading.current?.focus();
      setOutlineOpen(false);
    },
    [clausesById, setParams, blocks, toIndex, filtered],
  );

  // deep link: scroll once the clause (and text) have loaded
  const scrolledFor = useRef<string | null>(null);
  useEffect(() => {
    if (!activeClauseId || scrolledFor.current === activeClauseId || !blocks.length) return;
    const c = clausesById.get(activeClauseId);
    if (!c) return;
    scrolledFor.current = activeClauseId;
    textRef.current?.scrollToBlock(blockOf(blocks, toIndex(c.start_offset)));
  }, [activeClauseId, clausesById, blocks, toIndex]);

  const step = (dir: 1 | -1) => {
    if (!filtered.length) return;
    const order = active?.order ?? (dir === 1 ? -Infinity : Infinity);
    const next =
      dir === 1
        ? filtered.find((c) => c.order > order)
        : [...filtered].reverse().find((c) => c.order < order);
    if (next) activate(next.id, { focusSummary: false });
    else announce(dir === 1 ? "Last clause" : "First clause");
  };

  const toggleHigh = () => {
    startTransition(() => toggleHighOnly());
    const nowHigh = !highOnly;
    announce(nowHigh ? "Showing High-risk clauses only" : "Showing all clauses");
    if (nowHigh && active && !visibleInFilter(active, true)) {
      const next =
        clauses.find((c) => c.order > active.order && visibleInFilter(c, true)) ??
        clauses.find((c) => visibleInFilter(c, true));
      if (next) activate(next.id, { focusSummary: false });
    }
  };

  const goToMatch = (i: number) => {
    const m = matches[i];
    if (!m) return;
    setActiveMatch(i);
    textRef.current?.scrollToBlock(blockOf(blocks, m.start));
  };

  useHotkeys({
    j: () => step(1),
    k: () => step(-1),
    h: toggleHigh,
    "/": (e) => {
      e.preventDefault();
      beforeSearch.current =
        document.activeElement instanceof HTMLElement ? document.activeElement : null;
      searchRef.current?.focus();
    },
  });

  const matchLabel =
    deferredQuery.trim().length < 2
      ? ""
      : matches.length === 0
        ? "No matches"
        : `${activeMatch + 1} of ${matches.length >= 2000 ? "2000+" : matches.length}`;

  if (textQ.isError)
    return <QueryErrorAlert error={textQ.error} onRetry={() => void textQ.refetch()} />;

  const outline = (
    <ClauseOutline
      clauses={filtered}
      activeClauseId={activeClauseId}
      onSelect={(id) => activate(id)}
      loading={clausesQ.isPending || !clausesQ.complete}
      overlapsOf={overlapsOf}
    />
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <h2 className="sr-only">Contract text</h2>
      <div role="toolbar" aria-label="Viewer tools" className="flex flex-wrap items-center gap-2">
        {!isDesktop ? (
          <Button leadingIcon={ListTree} onClick={() => setOutlineOpen(true)}>
            Outline
          </Button>
        ) : null}
        <Button
          leadingIcon={ShieldAlert}
          aria-pressed={highOnly}
          onClick={toggleHigh}
          className={cn(highOnly && "border-primary bg-sunken")}
        >
          High risk only <span className="sr-only">(shortcut H)</span>
        </Button>
        <div className="flex min-w-0 flex-1 items-center gap-1 sm:flex-none">
          <label htmlFor="viewer-search" className="sr-only">
            Search contract text (shortcut /)
          </label>
          <div className="relative min-w-0 flex-1">
            <Search
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-fg-muted"
            />
            <input
              id="viewer-search"
              ref={searchRef}
              type="search"
              placeholder="Search text  ( / )"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (!matches.length) return;
                  const n = matches.length;
                  goToMatch(e.shiftKey ? (activeMatch - 1 + n) % n : (activeMatch + 1) % n);
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  setQuery("");
                  beforeSearch.current?.focus();
                }
              }}
              className={cn(inputClass, "h-control pl-8 sm:w-64")}
            />
          </div>
          <IconButton
            icon={ChevronUp}
            label="Previous match"
            aria-disabled={!matches.length || undefined}
            onClick={() => goToMatch((activeMatch - 1 + matches.length) % matches.length)}
          />
          <IconButton
            icon={ChevronDown}
            label="Next match"
            aria-disabled={!matches.length || undefined}
            onClick={() => goToMatch((activeMatch + 1) % matches.length)}
          />
          <span aria-live="polite" className="min-w-16 text-sm text-fg-muted tabular-nums">
            {matchLabel}
          </span>
        </div>
      </div>

      {clausesQ.isError ? (
        <QueryErrorAlert error={clausesQ.error} onRetry={() => void clausesQ.refetch()} />
      ) : null}

      {/* mobile: counts-only strip */}
      <div className="rounded-lg border border-border bg-surface p-2 md:hidden">
        <RiskCountsRow clauses={clauses} />
      </div>

      <div className="grid h-[75dvh] min-h-96 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_300px] xl:h-[calc(100dvh-15rem)] xl:grid-cols-[280px_minmax(0,1fr)_320px]">
        {isDesktop ? (
          <div className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-border bg-surface p-3">
            {outline}
          </div>
        ) : null}
        <div className="min-h-0">
          {textQ.isPending ? (
            <div
              className="flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-6"
              role="status"
            >
              <span className="sr-only">Loading contract text…</span>
              {Array.from({ length: 10 }, (_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : text === "" ? (
            <EmptyState
              message="No text could be extracted from this document."
              action={
                <Link to="/contracts" className="text-link underline">
                  Back to contracts
                </Link>
              }
            />
          ) : (
            <ContractTextView
              ref={textRef}
              text={text}
              blocks={blocks}
              spans={spans}
              spansVersion={`${clauses.length}:${matches.length}`}
              activeClauseId={activeClauseId}
              activeMatchId={matches.length ? `m:${activeMatch}` : null}
              clausesById={clausesById}
              onActivateClause={(id) => activate(id)}
            />
          )}
        </div>
        <div className="hidden min-h-0 md:flex md:flex-col">
          <RiskSummary
            ref={summaryHeading}
            contractId={contractId}
            clauses={clauses}
            active={active}
            total={clausesQ.total}
            onProvenance={setProvenanceId}
          />
        </div>
      </div>
      {/* mobile: active clause card below the text */}
      <div className="md:hidden">
        {active ? (
          <RiskSummary
            contractId={contractId}
            clauses={clauses}
            active={active}
            total={clausesQ.total}
            onProvenance={setProvenanceId}
          />
        ) : null}
      </div>

      {!isDesktop ? (
        <Drawer open={outlineOpen} onOpenChange={setOutlineOpen} title="Clause outline">
          {outline}
        </Drawer>
      ) : null}
      <ProvenanceDrawer
        contractId={contractId}
        clause={provenanceId ? (clausesById.get(provenanceId) ?? null) : null}
        open={provenanceId !== null}
        onOpenChange={(o) => !o && setProvenanceId(null)}
        currentPlaybookHash={contract.data?.playbook_version_hash ?? null}
      />
    </div>
  );
}
