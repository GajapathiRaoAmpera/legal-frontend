import { describe, expect, it } from "vitest";
import type { ClauseWithRisk, RiskLevel } from "@/api/types";
import { makeOffsetMapper } from "@/lib/offsets";
import { makeDocument } from "@/test/fixtures";
import {
  blockOf,
  buildSegments,
  buildSpans,
  findMatches,
  splitIntoBlocks,
  type Span,
  type TextBlock,
} from "./segments";

const span = (
  id: string,
  start: number,
  end: number,
  level: RiskLevel | null,
  kind: Span["kind"] = "clause",
): Span => ({
  id,
  kind,
  start,
  end,
  level,
  clauseId: kind === "clause" ? id : (id.split(":")[0] ?? id),
});
const block = (start: number, end: number): TextBlock => ({
  index: 0,
  start,
  end,
  sectionId: null,
  heading: null,
});
const simple = (segs: ReturnType<typeof buildSegments>) =>
  segs.map((s) => [s.start, s.end, s.topLevel, s.clauseIds.join(",")]);

describe("buildSegments (highlight overlap)", () => {
  it("disjoint spans", () => {
    const segs = buildSegments(block(0, 20), [span("a", 2, 5, "Low"), span("b", 10, 15, "High")]);
    expect(simple(segs)).toEqual([
      [0, 2, null, ""],
      [2, 5, "Low", "a"],
      [5, 10, null, ""],
      [10, 15, "High", "b"],
      [15, 20, null, ""],
    ]);
  });

  it("partial overlap: highest severity wins, all clauses listed", () => {
    const segs = buildSegments(block(0, 10), [span("a", 0, 6, "Medium"), span("b", 4, 10, "High")]);
    expect(simple(segs)).toEqual([
      [0, 4, "Medium", "a"],
      [4, 6, "High", "b,a"],
      [6, 10, "High", "b"],
    ]);
  });

  it("nesting: inner lower-severity span keeps outer High fill; equal severity puts innermost first", () => {
    const segs = buildSegments(block(0, 10), [
      span("outer", 0, 10, "High"),
      span("inner", 3, 6, "Low"),
    ]);
    expect(segs[1]).toMatchObject({
      start: 3,
      end: 6,
      topLevel: "High",
      clauseIds: ["outer", "inner"],
    });
    const eq = buildSegments(block(0, 10), [
      span("outer", 0, 10, "High"),
      span("inner", 3, 6, "High"),
    ]);
    expect(eq[1]?.clauseIds).toEqual(["inner", "outer"]);
  });

  it("adjacency: no gap and no merged segment", () => {
    const segs = buildSegments(block(0, 10), [span("a", 0, 5, "Low"), span("b", 5, 10, "High")]);
    expect(simple(segs)).toEqual([
      [0, 5, "Low", "a"],
      [5, 10, "High", "b"],
    ]);
    expect(segs[1]?.startsClauseIds).toEqual(["b"]);
  });

  it("spans crossing block boundaries are clipped to the block", () => {
    const segs = buildSegments(block(5, 10), [span("a", 0, 7, "High")]);
    expect(simple(segs)).toEqual([
      [5, 7, "High", "a"],
      [7, 10, null, ""],
    ]);
    expect(segs[0]?.startsClauseIds).toEqual([]); // the clause starts in an earlier block
  });

  it("marks quotes, unassessed clauses and search hits", () => {
    const segs = buildSegments(
      block(0, 10),
      [span("a", 0, 10, null), span("a:q", 2, 4, null, "quote"), span("m:0", 6, 8, null, "match")],
      "m:0",
    );
    expect(segs.find((s) => s.start === 2)).toMatchObject({
      isQuote: true,
      hasClause: true,
      topLevel: null,
    });
    expect(segs.find((s) => s.start === 6)).toMatchObject({ isMatch: true, isActiveMatch: true });
  });
});

describe("buildSpans", () => {
  const base = {
    contract_id: "c",
    section_id: "s",
    clause_type: "liability" as const,
    heading: null,
    text: "",
    order: 0,
    needs_human: false,
  };
  it("clamps out-of-range offsets, drops empty spans and clamps quotes into the clause", () => {
    const clauses: ClauseWithRisk[] = [
      { ...base, id: "a", start_offset: 5, end_offset: 999, risk: null },
      { ...base, id: "b", start_offset: 3, end_offset: 3, risk: null },
      {
        ...base,
        id: "c",
        start_offset: 0,
        end_offset: 4,
        risk: {
          id: "r",
          clause_id: "c",
          level: "High",
          score: 90,
          rationale: "",
          quoted_span: "",
          span_start: 2,
          span_end: 50,
          playbook_position_id: null,
          red_flags: [],
          provenance: {
            provider: "",
            model_id: "",
            prompt_id: "",
            prompt_version: "",
            playbook_version_hash: "",
            retrieved_chunk_ids: [],
            langfuse_trace_id: null,
          },
        },
      },
    ];
    const spans = buildSpans(clauses, makeOffsetMapper("x".repeat(10)), 10);
    expect(spans.map((s) => [s.id, s.start, s.end])).toEqual([
      ["c", 0, 4],
      ["c:q", 2, 4],
      ["a", 5, 10],
    ]);
  });

  it("maps fixture clauses exactly onto their text", () => {
    const doc = makeDocument();
    const spans = buildSpans(doc.clauses, makeOffsetMapper(doc.text), doc.text.length);
    for (const c of doc.clauses) {
      const s = spans.find((x) => x.id === c.id);
      expect(doc.text.slice(s?.start, s?.end)).toBe(c.text);
      if (c.risk) {
        const q = spans.find((x) => x.id === `${c.id}:q`);
        expect(doc.text.slice(q?.start, q?.end)).toBe(c.risk.quoted_span);
      }
    }
  });
});

describe("splitIntoBlocks", () => {
  it("tiles the text exactly at sections and blank lines", () => {
    const doc = makeDocument();
    const blocks = splitIntoBlocks(doc.text, doc.sections, makeOffsetMapper(doc.text));
    expect(blocks[0]?.start).toBe(0);
    expect(blocks.at(-1)?.end).toBe(doc.text.length);
    blocks.slice(1).forEach((b, i) => expect(b.start).toBe(blocks[i]?.end));
    expect(blocks.filter((b) => b.heading).length).toBe(doc.sections.length);
  });

  it("hard-splits a huge paragraph at whitespace", () => {
    const text = "word ".repeat(3000);
    const blocks = splitIntoBlocks(text, [], (o) => o, 4000);
    expect(blocks.length).toBeGreaterThan(3);
    expect(blocks.every((b) => b.end - b.start <= 4000)).toBe(true);
    expect(blocks.every((b) => b.start === 0 || text[b.start - 1] === " ")).toBe(true);
  });

  it("handles empty text", () => expect(splitIntoBlocks("", [], (o) => o)).toEqual([]));

  it("blockOf finds the containing block", () => {
    const blocks = splitIntoBlocks("aa\n\nbb\n\ncc", [], (o) => o);
    expect(blockOf(blocks, 0)).toBe(0);
    expect(blockOf(blocks, 5)).toBe(1);
    expect(blockOf(blocks, 9)).toBe(2);
  });
});

describe("findMatches", () => {
  it("is case-insensitive, literal and capped", () => {
    expect(findMatches("Liability… LIABILITY (liability)", "liability")).toHaveLength(3);
    expect(findMatches("a.b a.b", ".")).toEqual([]); // < 2 chars
    expect(findMatches("x(y x(y", "x(")).toHaveLength(2); // no regex
    expect(findMatches("ab ".repeat(100), "ab", 10)).toHaveLength(10);
  });
});
