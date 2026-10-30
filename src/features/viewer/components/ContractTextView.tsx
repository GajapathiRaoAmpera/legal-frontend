import { forwardRef, memo, useImperativeHandle, useMemo, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import type { ClauseWithRisk } from "@/api/types";
import { RISK_META } from "@/features/risk/riskMeta";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { cn } from "@/lib/cn";
import { CLAUSE_TYPE_LABEL } from "@/lib/format";
import { buildSegments, type Span, type TextBlock } from "../lib/segments";

export type ContractTextHandle = { scrollToBlock: (index: number) => void };

type Props = {
  text: string;
  blocks: TextBlock[];
  spans: Span[];
  spansVersion: string;
  activeClauseId: string | null;
  activeMatchId: string | null;
  clausesById: Map<string, ClauseWithRisk>;
  onActivateClause: (id: string) => void;
};

function markerLabel(c: ClauseWithRisk | undefined): string {
  if (!c) return "Clause";
  const type = CLAUSE_TYPE_LABEL[c.clause_type];
  if (c.needs_human && !c.risk) return `Needs human review, ${type} clause`;
  if (!c.risk) return `Not assessed, ${type} clause`;
  return `${c.risk.level} risk, ${type} clause, score ${c.risk.score}`;
}

const Block = memo(function Block({
  text,
  block,
  spans,
  activeClauseId,
  activeMatchId,
  clausesById,
  onActivateClause,
}: Omit<Props, "blocks" | "spansVersion"> & { block: TextBlock }) {
  const segments = useMemo(
    () => buildSegments(block, spans, activeMatchId),
    [block, spans, activeMatchId],
  );
  return (
    <div dir="auto" className="pb-0 font-serif text-md whitespace-pre-wrap text-fg">
      {block.heading ? <span className="sr-only">Section: </span> : null}
      {segments.map((s) => {
        const slice = text.slice(s.start, s.end);
        if (!s.hasClause && !s.isMatch) return slice;
        const primary = s.clauseIds[0];
        return (
          <span key={s.start}>
            {s.startsClauseIds.map((id) => {
              const c = clausesById.get(id);
              const level = c?.risk?.level ?? null;
              const Icon = level ? RISK_META[level].icon : null;
              return (
                // marker buttons are mouse affordances; keyboard users navigate via the outline (no tab stop flood)
                <button
                  key={id}
                  type="button"
                  tabIndex={-1}
                  data-clause-start={id}
                  onClick={() => onActivateClause(id)}
                  className={cn(
                    "mr-1 inline-flex h-5 items-center gap-1 rounded-sm px-1 align-text-bottom font-sans text-xs font-medium whitespace-nowrap",
                    level
                      ? [RISK_META[level].cls.bg, RISK_META[level].cls.fg]
                      : "border border-border-strong bg-surface text-fg",
                    id === activeClauseId && "clause-flash",
                  )}
                >
                  {Icon ? <Icon aria-hidden="true" className="size-3" /> : null}
                  <span aria-hidden="true">
                    {level
                      ? RISK_META[level].label
                      : c?.needs_human
                        ? "Needs review"
                        : "Not assessed"}
                  </span>
                  <span className="sr-only">{markerLabel(c)}</span>
                </button>
              );
            })}
            {s.hasClause || s.isMatch ? (
              <mark
                data-clause-id={primary}
                className={cn(
                  "mark",
                  s.hasClause && s.topLevel
                    ? [RISK_META[s.topLevel].cls.mark, `mark-${s.topLevel}`]
                    : s.hasClause
                      ? "mark-none"
                      : "bg-transparent",
                  s.isQuote && "mark-quote",
                  s.isMatch && "bg-match",
                  s.isActiveMatch && "mark-active",
                  primary !== undefined && primary === activeClauseId && "mark-active",
                )}
              >
                {slice}
              </mark>
            ) : (
              slice
            )}
          </span>
        );
      })}
    </div>
  );
});

/** Block-level virtualized contract text (contract-ui-performance §3). Scroll container is focusable for keyboard scrolling. */
export const ContractTextView = forwardRef<ContractTextHandle, Props>(
  function ContractTextView(props, ref) {
    const { blocks, text } = props;
    const parentRef = useRef<HTMLDivElement>(null);
    const reduced = useReducedMotion();
    const virtualizer = useVirtualizer({
      count: blocks.length,
      getScrollElement: () => parentRef.current,
      estimateSize: (i) => {
        const b = blocks[i];
        return b ? Math.ceil((b.end - b.start) / 90) * 26 + 16 : 42;
      },
      overscan: 6,
      getItemKey: (i) => blocks[i]?.start ?? i,
    });

    useImperativeHandle(
      ref,
      () => ({
        scrollToBlock(index) {
          virtualizer.scrollToIndex(index, {
            align: "start",
            behavior: reduced ? "auto" : "smooth",
          });
          // re-align once after dynamic measurement (deep links)
          requestAnimationFrame(() => virtualizer.scrollToIndex(index, { align: "start" }));
        },
      }),
      [virtualizer, reduced],
    );

    const items = virtualizer.getVirtualItems();
    return (
      <div
        ref={parentRef}
        role="region"
        aria-label="Contract text"
        tabIndex={0}
        data-testid="contract-text"
        className="h-full min-h-0 overflow-auto rounded-lg border border-border bg-surface"
      >
        <div
          className="relative mx-auto w-full max-w-[72ch] px-4 py-6"
          style={{ height: virtualizer.getTotalSize() + 48 }}
        >
          {items.map((v) => {
            const block = blocks[v.index];
            if (!block) return null;
            return (
              <div
                key={v.key}
                data-index={v.index}
                ref={virtualizer.measureElement}
                className="absolute right-4 left-4"
                style={{ transform: `translateY(${v.start + 24}px)` }}
              >
                <Block {...props} text={text} block={block} />
              </div>
            );
          })}
        </div>
      </div>
    );
  },
);
