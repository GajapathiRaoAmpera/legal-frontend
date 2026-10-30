import { describe, expect, it } from "vitest";
import { safeNext } from "./auth";

describe("safeNext", () => {
  it("allows same-origin paths only", () => {
    expect(safeNext("/contracts/1?clause=2")).toBe("/contracts/1?clause=2");
    expect(safeNext("//evil.example")).toBe("/contracts");
    expect(safeNext("https://evil.example")).toBe("/contracts");
    expect(safeNext("/\\evil")).toBe("/contracts");
    expect(safeNext(null)).toBe("/contracts");
  });
});
