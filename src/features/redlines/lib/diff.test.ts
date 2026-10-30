import { describe, expect, it } from "vitest";
import { diffWords } from "./diff";

const join = (ops: ReturnType<typeof diffWords>, keep: 0 | 1 | -1) =>
  ops
    .filter((o) => o.op === 0 || o.op === keep)
    .map((o) => o.text)
    .join("");

describe("diffWords", () => {
  it("replaces whole words, not characters", () => {
    const ops = diffWords("notice of ninety (90) days", "notice of thirty (30) days");
    expect(ops).toContainEqual({ op: -1, text: expect.stringContaining("ninety") as string });
    expect(ops).toContainEqual({ op: 1, text: expect.stringContaining("thirty") as string });
    expect(ops.some((o) => o.text === "y")).toBe(false);
  });

  it("reconstructs both sides exactly", () => {
    const a = "Customer's liability is unlimited.";
    const b = "Customer's liability shall not exceed the fees paid.";
    const ops = diffWords(a, b);
    expect(join(ops, -1)).toBe(a);
    expect(join(ops, 1)).toBe(b);
  });

  it("handles pure insert, pure delete, identical and whitespace-only changes", () => {
    expect(diffWords("", "new text")).toEqual([{ op: 1, text: "new text" }]);
    expect(diffWords("old text", "")).toEqual([{ op: -1, text: "old text" }]);
    expect(diffWords("same", "same")).toEqual([{ op: 0, text: "same" }]);
    const ws = diffWords("a b", "a  b");
    expect(join(ws, 1)).toBe("a  b");
  });

  it("keeps unicode intact", () => {
    const ops = diffWords("Le délai est de 90 jours — ok", "Le délai est de 30 jours — ok 😀");
    expect(join(ops, 1)).toBe("Le délai est de 30 jours — ok 😀");
  });

  it("still returns a valid (possibly coarse) diff with a tiny timeout", () => {
    const a = Array.from({ length: 3000 }, (_, i) => `w${i}`).join(" ");
    const b = Array.from({ length: 3000 }, (_, i) => (i % 7 ? `w${i}` : `x${i}`)).join(" ");
    const ops = diffWords(a, b, { timeoutMs: 1 });
    expect(join(ops, -1)).toBe(a);
    expect(join(ops, 1)).toBe(b);
  });
});
