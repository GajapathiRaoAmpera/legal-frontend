import type { ClauseWithRisk, ContractText, RiskLevel } from "@/api/types";
import { rankOf } from "@/features/risk/riskMeta";
import { log } from "@/lib/log";

export type Span = {
  id: string; // clause id, `${clauseId}:q` for the quoted risk span, `m:${i}` for a search hit
  kind: "clause" | "quote" | "match";
  start: number;
  end: number;
  level: RiskLevel | null;
  clauseId: string;
};

export type Segment = {
  start: number;
  end: number;
  spanIds: readonly string[]; // covering spans, innermost + highest severity first
  clauseIds: readonly string[]; // covering clause ids in the same order
  hasClause: boolean;
  topLevel: RiskLevel | null; // max severity among covering clause spans
  isQuote: boolean;
  isMatch: boolean;
  isActiveMatch: boolean;
  startsClauseIds: readonly string[]; // clauses whose first character is this segment's start
};

export type TextBlock = {
  index: number;
  start: number;
  end: number;
  sectionId: string | null;
  heading: string | null;
};

/** Clause + quote spans in text indexes, clamped; empty spans dropped. Sorted by start. */
export function buildSpans(
  clauses: ClauseWithRisk[],
  toIndex: (offset: number) => number,
  textLength: number,
): Span[] {
  const spans: Span[] = [];
  for (const c of clauses) {
    const start = Math.min(toIndex(c.start_offset), textLength);
    const end = Math.min(toIndex(c.end_offset), textLength);
    if (end <= start) {
      log.warn("viewer: dropped empty/out-of-range clause span", {
        clauseId: c.id,
        start: c.start_offset,
        end: c.end_offset,
        textLength,
      });
      continue;
    }
    const level = c.risk?.level ?? null;
    spans.push({ id: c.id, kind: "clause", start, end, level, clauseId: c.id });
    if (c.risk) {
      // the quote must lie inside its clause: clamp, drop if that empties it
      const qs = Math.max(start, toIndex(c.risk.span_start));
      const qe = Math.min(end, toIndex(c.risk.span_end));
      if (qe > qs)
        spans.push({ id: `${c.id}:q`, kind: "quote", start: qs, end: qe, level, clauseId: c.id });
    }
  }
  return spans.sort((a, b) => a.start - b.start || b.end - a.end);
}

/** Split at section starts, then blank lines, then hard-split long runs at whitespace. Blocks tile the text exactly. */
export function splitIntoBlocks(
  text: string,
  sections: ContractText["sections"],
  toIndex: (offset: number) => number,
  maxBlockChars = 4000,
): TextBlock[] {
  const cuts = new Set<number>([0, text.length]);
  const sorted = [...sections].sort((a, b) => a.start_offset - b.start_offset);
  for (const s of sorted) cuts.add(Math.min(toIndex(s.start_offset), text.length));
  const para = /\n[ \t]*\n+/g;
  for (let m = para.exec(text); m; m = para.exec(text)) cuts.add(m.index + m[0].length);
  const points = [...cuts].sort((a, b) => a - b);

  const blocks: TextBlock[] = [];
  const sectionAt = (pos: number) => {
    let hit: (typeof sorted)[number] | undefined;
    for (const s of sorted) if (toIndex(s.start_offset) <= pos) hit = s;
    return hit;
  };
  let lastSection: string | null = null;
  for (let i = 0; i < points.length - 1; i++) {
    let start = points[i] ?? 0;
    const end = points[i + 1] ?? text.length;
    if (end <= start) continue;
    const sec = sectionAt(start);
    while (end - start > maxBlockChars) {
      const limit = start + maxBlockChars;
      const ws = text.lastIndexOf(" ", limit);
      const cut = ws > start + maxBlockChars / 2 ? ws + 1 : limit;
      blocks.push({
        index: blocks.length,
        start,
        end: cut,
        sectionId: sec?.id ?? null,
        heading: null,
      });
      start = cut;
    }
    const isFirstOfSection = sec !== undefined && sec.id !== lastSection;
    blocks.push({
      index: blocks.length,
      start,
      end,
      sectionId: sec?.id ?? null,
      heading: isFirstOfSection ? sec.heading : null,
    });
    lastSection = sec?.id ?? lastSection;
  }
  return blocks;
}

/** Index of the block containing `pos` (binary search). */
export function blockOf(blocks: TextBlock[], pos: number): number {
  let lo = 0;
  let hi = blocks.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if ((blocks[mid]?.start ?? 0) <= pos) lo = mid;
    else hi = mid - 1;
  }
  return lo;
}

/** Spans overlapping [start, end). spans sorted by start. */
export function spansInRange(spans: Span[], start: number, end: number): Span[] {
  // binary search the first span starting at/after `end`; everything before it may overlap
  let lo = 0;
  let hi = spans.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if ((spans[mid]?.start ?? 0) < end) lo = mid + 1;
    else hi = mid;
  }
  // shortcut: linear filter of the prefix; fine for ≤2,000 clauses × visible blocks, upgrade to an interval tree if profiling shows it
  const out: Span[] = [];
  for (let i = 0; i < lo; i++) {
    const s = spans[i];
    if (s && s.end > start) out.push(s);
  }
  return out;
}

/** Boundary sweep: contiguous, non-overlapping segments for one block. Handles overlap, nesting, adjacency. */
export function buildSegments(
  block: TextBlock,
  spans: Span[],
  activeMatchId: string | null = null,
): Segment[] {
  const local = spansInRange(spans, block.start, block.end);
  const points = new Set<number>([block.start, block.end]);
  for (const s of local) {
    if (s.start > block.start && s.start < block.end) points.add(s.start);
    if (s.end > block.start && s.end < block.end) points.add(s.end);
  }
  const sorted = [...points].sort((a, b) => a - b);
  const segs: Segment[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    const a = sorted[i] ?? 0;
    const b = sorted[i + 1] ?? 0;
    const covering = local
      .filter((s) => s.start <= a && s.end >= b)
      .sort((x, y) => rankOf(y.level) - rankOf(x.level) || x.end - x.start - (y.end - y.start));
    const clauses = covering.filter((s) => s.kind === "clause");
    segs.push({
      start: a,
      end: b,
      spanIds: covering.map((s) => s.id),
      clauseIds: clauses.map((s) => s.clauseId),
      hasClause: clauses.length > 0,
      topLevel: clauses[0]?.level ?? null,
      isQuote: covering.some((s) => s.kind === "quote"),
      isMatch: covering.some((s) => s.kind === "match"),
      isActiveMatch: activeMatchId !== null && covering.some((s) => s.id === activeMatchId),
      startsClauseIds: clauses.filter((s) => s.start === a).map((s) => s.clauseId),
    });
  }
  return segs;
}

/** Case-insensitive literal search (never a regex from user input). Requires ≥2 chars. */
export function findMatches(
  text: string,
  query: string,
  limit = 2000,
): { start: number; end: number }[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  // shortcut: toLowerCase can change length for a few scripts (e.g. "İ"); fall back to exact-case search then
  const hay = text.toLowerCase();
  const sameLength = hay.length === text.length;
  const source = sameLength ? hay : text;
  const needle = sameLength ? q : query.trim();
  const out: { start: number; end: number }[] = [];
  for (
    let i = source.indexOf(needle);
    i !== -1 && out.length < limit;
    i = source.indexOf(needle, i + needle.length)
  ) {
    out.push({ start: i, end: i + needle.length });
  }
  return out;
}

export const matchSpans = (matches: { start: number; end: number }[]): Span[] =>
  matches.map((m, i) => ({
    id: `m:${i}`,
    kind: "match",
    start: m.start,
    end: m.end,
    level: null,
    clauseId: "",
  }));
