import { describe, expect, it } from "vitest";
import { makeOffsetMapper } from "./offsets";

describe("makeOffsetMapper", () => {
  it("is the identity on normalized fixture text (offsets == UTF-16 indexes)", () => {
    const text = "1. Liability. Supplier's liability is unlimited.� Fees are fixed.";
    const map = makeOffsetMapper(text);
    const start = text.indexOf("Supplier");
    const end = text.indexOf(".", start) + 1;
    expect(map(start)).toBe(start);
    expect(text.slice(map(start), map(end))).toBe("Supplier's liability is unlimited.");
  });

  it("clamps out-of-range offsets", () => {
    const map = makeOffsetMapper("abc");
    expect(map(-5)).toBe(0);
    expect(map(99)).toBe(3);
  });
});
